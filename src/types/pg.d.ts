declare module "pg" {
  export class Pool {
    constructor(config?: any);
    query<T = any>(text: string, values?: any[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
    connect(): Promise<{
      query<T = any>(text: string, values?: any[]): Promise<{ rows: T[] }>;
      release(): void;
    }>;
  }

  const pg: {
    Pool: typeof Pool;
  };

  export default pg;
}
