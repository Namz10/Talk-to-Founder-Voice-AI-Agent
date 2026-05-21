import asyncio
import signal

from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli

from agent import ManeuverAgent


load_dotenv()


async def entrypoint(ctx: JobContext):
    await ctx.connect()
    print("Agent connected")

    agent = ManeuverAgent()
    agent.start(ctx.room)

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, agent.stop)
        except NotImplementedError:
            pass

    await agent.run()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
