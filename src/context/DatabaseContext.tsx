import React, { createContext, useContext, useEffect, useState } from 'react';
import initSqlJs, { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

interface DatabaseContextType {
  db: Database | null;
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  error: null,
});

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Database | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const SQL = await initSqlJs({
          // Use bundled WASM file specifically meant for local frontend serving
          locateFile: () => sqlWasmUrl
        });
        let database: Database;
        
        // Load direct disk data if available
        const res = await fetch('/api/db');
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          database = new SQL.Database(new Uint8Array(buffer));
        } else {
          // Initialize fresh db
          database = new SQL.Database();
          database.run(`
            CREATE TABLE IF NOT EXISTS Workers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              age INTEGER,
              worker_id_code TEXT UNIQUE NOT NULL,
              face_descriptors BLOB,
              is_verified BOOLEAN DEFAULT 0,
              digital_token TEXT
            );
          `);
          // Initial save
          fetch('/api/db', { method: 'POST', body: new Blob([database.export()]) }).catch(console.error);
        }

        // Magic Interceptor: Auto-save on every SQL 'run' (inserts/updates)
        const originalRun = database.run.bind(database);
        database.run = function(sql: string, params?: any[]) {
          const result = originalRun(sql, params);
          fetch('/api/db', { method: 'POST', body: new Blob([database.export()]) }).catch(console.error);
          return result;
        };

        setDb(database);
        setIsReady(true);
      } catch (err: any) {
        console.error("Failed to initialize SQLite", err);
        setError(err.message || 'Failed to initialize database');
      }
    };

    initDB();
    
    return () => {
      // Cleanup
      if (db) {
        db.close();
      }
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};
