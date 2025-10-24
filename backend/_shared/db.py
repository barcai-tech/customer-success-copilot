import os
from typing import Any, Dict, Tuple, Optional

from urllib.parse import urlparse, unquote, parse_qs
import ssl
import pg8000


def _must_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Missing env: {name}")
    return v


def get_conn():
    # Build pg8000 connection from DATABASE_URL (postgresql://user:pass@host:port/db?sslmode=require)
    dsn = _must_env("DATABASE_URL")
    u = urlparse(dsn)
    if u.scheme not in ("postgresql", "postgres"):
        raise RuntimeError("Unsupported DATABASE_URL scheme")
    user = unquote(u.username or "")
    password = unquote(u.password or "")
    host = u.hostname or "localhost"
    port = int(u.port or 5432)
    database = (u.path or "/").lstrip("/") or None
    qs = parse_qs(u.query)
    sslmode = (qs.get("sslmode", [""])[0] or "require").lower()
    ctx = None
    if sslmode in ("require", "verify-full", "verify-ca"):
        ctx = ssl.create_default_context()
        # Neon provides trusted certs; for verify-full you could set hostname checks (default True).
    # pg8000 DB-API connect
    conn = pg8000.dbapi.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        database=database,
        ssl_context=ctx,
    )
    # pg8000's DB-API connection doesn't implement context manager; close explicitly in callers
    conn.autocommit = True
    return conn


def _fetch_one(sql: str, params: Tuple[Any, ...]) -> Optional[Tuple[Any, ...]]:
    conn = get_conn()
    try:
        cur = conn.cursor()
        try:
            cur.execute(sql, params)
            return cur.fetchone()
        finally:
            try:
                cur.close()
            except Exception:
                pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def get_usage(owner_user_id: str, company_external_id: str) -> Dict[str, Any]:
    row = _fetch_one(
        (
            """
            select trend, avg_daily_users, sparkline
            from usage_summaries
            where owner_user_id = %s and company_external_id = %s
            limit 1
            """
        ),
        (owner_user_id, company_external_id),
    )
    if not row:
        return {"trend": "flat", "avgDailyUsers": 0, "sparkline": [], "missingData": True}
    trend, avg_daily_users, sparkline = row
    return {"trend": trend, "avgDailyUsers": int(avg_daily_users or 0), "sparkline": sparkline or [], "missingData": False}


def get_tickets(owner_user_id: str, company_external_id: str) -> Dict[str, Any]:
    row = _fetch_one(
        (
            """
            select open_tickets, recent_tickets
            from ticket_summaries
            where owner_user_id = %s and company_external_id = %s
            limit 1
            """
        ),
        (owner_user_id, company_external_id),
    )
    if not row:
        return {"openTickets": 0, "recentTickets": [], "missingData": True}
    open_tickets, recent_tickets = row
    return {"openTickets": int(open_tickets or 0), "recentTickets": recent_tickets or [], "missingData": False}


def get_contract(owner_user_id: str, company_external_id: str) -> Dict[str, Any]:
    row = _fetch_one(
        (
            """
            select renewal_date, arr
            from contracts
            where owner_user_id = %s and company_external_id = %s
            limit 1
            """
        ),
        (owner_user_id, company_external_id),
    )
    if not row:
        return {"renewalDate": None, "arr": 0, "missingData": True}
    renewal_date, arr = row
    return {"renewalDate": renewal_date, "arr": int(arr or 0), "missingData": False}
