"""命令行入口:启动 Web 服务。"""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="启动小学数学口算题目生成器 Web 服务")
    parser.add_argument("--host", default="127.0.0.1", help="监听地址")
    parser.add_argument("--port", type=int, default=8000, help="监听端口")
    parser.add_argument("--reload", action="store_true", help="开发模式:代码改动自动重载")
    args = parser.parse_args()

    import uvicorn

    uvicorn.run("app.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
