import os
from typing import Any, Dict

import psycopg


def _must_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Missing env: {name}")
    return v


def get_conn():
    # Use DATABASE_URL, compatible with Neon
    dsn = _must_env("DATABASE_URL")
    return psycopg.connect(dsn, autocommit=True)


def get_usage(owner_user_id: str, company_external_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select trend, avg_daily_users, sparkline
                from usage_summaries
                where owner_user_id = %s and company_external_id = %s
                limit 1
                """,
                (owner_user_id, company_external_id),
            )
            row = cur.fetchone()
            if not row:
                raise FileNotFoundError("usage not found")
            trend, avg_daily_users, sparkline = row
            return {
                "trend": trend,
                "avgDailyUsers": int(avg_daily_users),
                "sparkline": sparkline or [],
            }


def get_tickets(owner_user_id: str, company_external_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select open_tickets, recent_tickets
                from ticket_summaries
                where owner_user_id = %s and company_external_id = %s
                limit 1
                """,
                (owner_user_id, company_external_id),
            )
            row = cur.fetchone()
            if not row:
                raise FileNotFoundError("tickets not found")
            open_tickets, recent_tickets = row
            return {
                "openTickets": int(open_tickets or 0),
                "recentTickets": recent_tickets or [],
            }


def get_contract(owner_user_id: str, company_external_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select renewal_date, arr
                from contracts
                where owner_user_id = %s and company_external_id = %s
                limit 1
                """,
                (owner_user_id, company_external_id),
            )
            row = cur.fetchone()
            if not row:
                raise FileNotFoundError("contract not found")
            renewal_date, arr = row
            return {
                "renewalDate": renewal_date,
                "arr": int(arr or 0),
            }

