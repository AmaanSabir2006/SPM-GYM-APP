import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
from app.models import Gym, User, Member, FeeRecord, AttendanceRecord


async def init_db():
    print("Connecting to Supabase PostgreSQL...")
    async with engine.begin() as conn:
        print("Creating all GymTrack tables if not already present...")
        await conn.run_sync(Base.metadata.create_all)
        
        query = text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        result = await conn.execute(query)
        tables = [row[0] for row in result.fetchall()]
        print("\n=== Live Supabase Tables ===")
        for t in tables:
            print(f" -> {t}")
        print("============================\n")
        print("Database sync complete!")


if __name__ == "__main__":
    asyncio.run(init_db())
