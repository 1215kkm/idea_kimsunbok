/**
 * firebase-admin Firestore 의 in-memory 가짜 (테스트 전용).
 *
 * 흉내 내는 것:
 *  - collection().doc(id?) / doc.get() / collection().where().select().get() (동등 조건만)
 *  - runTransaction(fn): 읽기는 커밋된 상태를 보고, 쓰기는 버퍼에 쌓였다가 fn 성공 시 한꺼번에 적용.
 *  - 낙관적 잠금: 트랜잭션이 읽은 문서가 커밋 전에 다른 트랜잭션에 의해 바뀌면 ABORTED → fn 재실행 (최대 5회).
 *    → 동시 리딤 테스트에서 "정확히 1명만 성공" 을 실제 Firestore 와 같은 원리로 재현.
 *  - Firestore 제약 "쓰기 후 읽기 금지" 를 그대로 에러로 재현 (서비스가 읽기→쓰기 순서를 지키는지 검증).
 *  - tx.create 는 이미 존재하면 실패 (ALREADY_EXISTS).
 *  - FieldValue.serverTimestamp() 는 mock 모듈에서 number 로 대체.
 */

type Data = Record<string, unknown>;

export class FakeSnapshot {
  constructor(
    public readonly id: string,
    private readonly _data: Data | null,
  ) {}
  get exists(): boolean {
    return this._data !== null;
  }
  data(): Data | undefined {
    return this._data === null ? undefined : { ...this._data };
  }
}

export class FakeDocRef {
  constructor(
    public readonly db: FakeFirestore,
    public readonly path: string,
    public readonly id: string,
  ) {}
  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.id, this.db.read(this.path));
  }
}

class FakeQuery {
  constructor(
    private readonly db: FakeFirestore,
    private readonly name: string,
    private readonly filters: Array<[string, unknown]> = [],
  ) {}
  where(field: string, op: string, value: unknown): FakeQuery {
    if (op !== "==") throw new Error(`FakeQuery: unsupported op ${op}`);
    return new FakeQuery(this.db, this.name, [...this.filters, [field, value]]);
  }
  select(): FakeQuery {
    return this;
  }
  orderBy(): FakeQuery {
    return this;
  }
  limit(): FakeQuery {
    return this;
  }
  async get() {
    const docs = this.db
      .docsIn(this.name)
      .filter(({ data }) => this.filters.every(([f, v]) => data[f] === v))
      .map(({ id, data }) => new FakeSnapshot(id, data));
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (cb: (s: FakeSnapshot) => void) => docs.forEach(cb),
    };
  }
}

class FakeCollection extends FakeQuery {
  constructor(
    private readonly _db: FakeFirestore,
    private readonly _name: string,
  ) {
    super(_db, _name);
  }
  doc(id?: string): FakeDocRef {
    const realId = id ?? `auto_${(++this._db.autoId).toString(36)}`;
    return new FakeDocRef(this._db, `${this._name}/${realId}`, realId);
  }
}

type Write =
  | { kind: "create"; path: string; data: Data }
  | { kind: "set"; path: string; data: Data; merge: boolean }
  | { kind: "update"; path: string; data: Data };

export class ContentionError extends Error {
  code = 10; // ABORTED
}

class FakeTransaction {
  private writes: Write[] = [];
  private readVersions = new Map<string, number>();
  constructor(private readonly db: FakeFirestore) {}

  async get(ref: FakeDocRef): Promise<FakeSnapshot> {
    if (this.writes.length > 0) {
      throw new Error("Firestore transactions require all reads to be executed before all writes.");
    }
    this.readVersions.set(ref.path, this.db.version(ref.path));
    // 실제 Firestore 처럼 비동기 경계를 만들어 동시 트랜잭션이 끼어들 수 있게 한다
    await Promise.resolve();
    return new FakeSnapshot(ref.id, this.db.read(ref.path));
  }
  create(ref: FakeDocRef, data: Data) {
    this.writes.push({ kind: "create", path: ref.path, data });
  }
  set(ref: FakeDocRef, data: Data, opts?: { merge?: boolean }) {
    this.writes.push({ kind: "set", path: ref.path, data, merge: !!opts?.merge });
  }
  update(ref: FakeDocRef, data: Data) {
    this.writes.push({ kind: "update", path: ref.path, data });
  }
  commit() {
    // 낙관적 잠금: 읽은 문서가 그 사이 바뀌었으면 충돌
    for (const [path, v] of this.readVersions) {
      if (this.db.version(path) !== v) throw new ContentionError(`contention on ${path}`);
    }
    // 검증 먼저 (원자성): 하나라도 실패하면 아무것도 적용 안 함
    const created = new Set<string>();
    for (const w of this.writes) {
      if (w.kind === "create") {
        if (this.db.read(w.path) !== null || created.has(w.path)) {
          throw Object.assign(new Error(`ALREADY_EXISTS: ${w.path}`), { code: 6 });
        }
        created.add(w.path);
      }
      if (w.kind === "update" && this.db.read(w.path) === null && !created.has(w.path)) {
        throw Object.assign(new Error(`NOT_FOUND: ${w.path}`), { code: 5 });
      }
    }
    for (const w of this.writes) {
      const cur = this.db.read(w.path);
      if (w.kind === "create") this.db.write(w.path, { ...w.data });
      else if (w.kind === "set") this.db.write(w.path, w.merge && cur ? { ...cur, ...w.data } : { ...w.data });
      else this.db.write(w.path, { ...(cur ?? {}), ...w.data });
    }
  }
}

export class FakeFirestore {
  store = new Map<string, Data>();
  private versions = new Map<string, number>();
  autoId = 0;
  /** 충돌로 재시도한 횟수 (테스트에서 실제 경합이 있었는지 확인용) */
  contentionRetries = 0;

  collection(name: string) {
    return new FakeCollection(this, name);
  }
  read(path: string): Data | null {
    const v = this.store.get(path);
    return v ? { ...v } : null;
  }
  version(path: string): number {
    return this.versions.get(path) ?? 0;
  }
  write(path: string, data: Data) {
    this.store.set(path, data);
    this.versions.set(path, this.version(path) + 1);
  }
  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const tx = new FakeTransaction(this);
      const result = await fn(tx);
      try {
        tx.commit();
        return result;
      } catch (err) {
        if (err instanceof ContentionError && attempt < 4) {
          this.contentionRetries += 1;
          continue;
        }
        throw err;
      }
    }
  }

  // --- 테스트 편의 ---
  seed(path: string, data: Data) {
    this.write(path, { ...data });
  }
  reset() {
    this.store.clear();
    this.versions.clear();
    this.autoId = 0;
    this.contentionRetries = 0;
  }
  docsIn(collection: string): Array<{ id: string; data: Data }> {
    const out: Array<{ id: string; data: Data }> = [];
    for (const [path, data] of this.store) {
      if (path.startsWith(`${collection}/`)) out.push({ id: path.slice(collection.length + 1), data: { ...data } });
    }
    return out;
  }
  /** 총량 모니터 좌변: Σ(totalPoints + lockedPoints) */
  ledgerTotal(): number {
    return this.docsIn("users").reduce(
      (s, u) => s + (Number(u.data.totalPoints) || 0) + (Number(u.data.lockedPoints) || 0),
      0,
    );
  }
}
