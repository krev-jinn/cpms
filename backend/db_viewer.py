"""
CPMS Database Inspector & Table Viewer
Allows examiners and students to:
1. View all database tables and rows directly in the browser at http://127.0.0.1:8080/db
2. Print formatted tables in the terminal using: python backend/db_viewer.py [table_name]
"""

import os
import sqlite3
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "cpms_database.db")

def get_table_names():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
    tables = [r[0] for r in cur.fetchall()]
    conn.close()
    return tables

def get_table_data(table_name):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Get schema columns
    cur.execute(f"PRAGMA table_info({table_name})")
    columns = [r["name"] for r in cur.fetchall()]
    
    # Get rows
    cur.execute(f"SELECT * FROM {table_name} LIMIT 100")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return columns, rows

def render_db_html(active_table=None):
    tables = get_table_names()
    if not active_table or active_table not in tables:
        active_table = "cases" if "cases" in tables else (tables[0] if tables else "")

    columns, rows = get_table_data(active_table) if active_table else ([], [])
    
    # Generate sidebar links with row counts
    conn = sqlite3.connect(DB_PATH)
    table_counts = {}
    for t in tables:
        cnt = conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        table_counts[t] = cnt
    conn.close()

    sidebar_items = ""
    for t in tables:
        is_active = "active" if t == active_table else ""
        count = table_counts.get(t, 0)
        sidebar_items += f'''
        <a href="/db?table={t}" class="db-nav-item {is_active}">
            <span>📁 {t}</span>
            <span class="badge">{count}</span>
        </a>'''

    # Generate table header
    th_html = "".join([f"<th>{col}</th>" for col in columns])
    
    # Generate table rows
    tr_html = ""
    for r in rows:
        tds = ""
        for col in columns:
            val = r.get(col, "")
            val_str = str(val) if val is not None else '<span style="color:#94a3b8">NULL</span>'
            if len(val_str) > 80:
                val_str = val_str[:77] + "..."
            tds += f"<td>{val_str}</td>"
        tr_html += f"<tr>{tds}</tr>"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CPMS Database Inspector - SQLite Tables</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; }}
    header {{ background: #1e293b; border-bottom: 1px solid #334155; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }}
    .logo-area {{ display: flex; align-items: center; gap: 12px; }}
    .logo-badge {{ background: #3b82f6; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 13px; }}
    h1 {{ font-size: 17px; font-weight: 700; color: #f8fafc; }}
    .db-path {{ font-size: 12px; color: #94a3b8; font-family: monospace; }}
    .top-links {{ display: flex; gap: 12px; }}
    .btn {{ background: #334155; color: #f8fafc; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; transition: 0.15s; }}
    .btn:hover {{ background: #475569; }}
    .btn-gold {{ background: #b45309; color: white; }}
    .btn-gold:hover {{ background: #d97706; }}
    
    .main-layout {{ display: flex; flex: 1; overflow: hidden; }}
    .sidebar {{ width: 260px; background: #1e293b; border-right: 1px solid #334155; padding: 16px 12px; overflow-y: auto; }}
    .sidebar-title {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; margin-bottom: 10px; padding-left: 8px; }}
    .db-nav-item {{ display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 6px; color: #cbd5e1; text-decoration: none; font-size: 13px; font-weight: 500; margin-bottom: 4px; transition: 0.15s; }}
    .db-nav-item:hover {{ background: #334155; color: white; }}
    .db-nav-item.active {{ background: #2563eb; color: white; font-weight: 600; }}
    .badge {{ background: rgba(255,255,255,0.15); padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }}
    
    .content {{ flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0b1120; }}
    .content-header {{ padding: 16px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }}
    .table-info {{ display: flex; align-items: center; gap: 12px; }}
    .table-title {{ font-size: 18px; font-weight: 700; color: #60a5fa; font-family: monospace; }}
    .table-stats {{ font-size: 13px; color: #94a3b8; }}
    
    .table-container {{ flex: 1; overflow: auto; padding: 20px 24px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left; background: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); }}
    th {{ background: #0f172a; color: #cbd5e1; padding: 12px 14px; font-weight: 600; border-bottom: 2px solid #334155; white-space: nowrap; font-family: monospace; }}
    td {{ padding: 10px 14px; border-bottom: 1px solid #334155; color: #e2e8f0; white-space: nowrap; }}
    tr:hover td {{ background: #2d3748; }}
  </style>
</head>
<body>
  <header>
    <div class="logo-area">
      <span class="logo-badge">SQL</span>
      <div>
        <h1>CPMS Database Inspector (SQLite Engine)</h1>
        <div class="db-path">File: backend/cpms_database.db &bull; Connected</div>
      </div>
    </div>
    <div class="top-links">
      <a href="/" class="btn btn-gold">⮌ Return to CPMS Web Portal</a>
      <a href="/docs" target="_blank" class="btn">⚡ OpenAPI / Swagger Docs</a>
      <a href="/api/firebase/export" target="_blank" class="btn">JSON Export</a>
    </div>
  </header>

  <div class="main-layout">
    <aside class="sidebar">
      <div class="sidebar-title">Database Tables ({len(tables)})</div>
      {sidebar_items}
    </aside>

    <main class="content">
      <div class="content-header">
        <div class="table-info">
          <span class="table-title">TABLE: {active_table}</span>
          <span class="table-stats">({len(rows)} records loaded &bull; {len(columns)} columns)</span>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>{th_html}</tr>
          </thead>
          <tbody>
            {tr_html}
          </tbody>
        </table>
      </div>
    </main>
  </div>
</body>
</html>
"""
    return html

def print_terminal_table(table_name="cases"):
    columns, rows = get_table_data(table_name)
    print(f"\n=======================================================")
    print(f" CPMS DATABASE TABLE: {table_name} ({len(rows)} rows)")
    print(f"=======================================================")
    if not rows:
        print(" (Table is empty)")
        return
    # Print columns
    header = " | ".join(columns[:6])
    print(header)
    print("-" * len(header))
    for r in rows[:10]:
        vals = [str(r.get(c, ""))[:20] for c in columns[:6]]
        print(" | ".join(vals))
    print(f"=======================================================\n")

if __name__ == "__main__":
    t_name = sys.argv[1] if len(sys.argv) > 1 else "cases"
    print_terminal_table(t_name)
