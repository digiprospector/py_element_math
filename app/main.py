"""FastAPI 应用:提供口算题目生成的网页界面与接口。"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from .generator import generate

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="小学数学口算题目生成器")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


class GenerateRequest(BaseModel):
    count: int = Field(20, ge=1, le=200, description="题目数量")
    a_min: int = Field(0, ge=0, le=10000, description="第一个数最小值")
    a_max: int = Field(20, ge=0, le=10000, description="第一个数最大值")
    b_min: int = Field(0, ge=0, le=10000, description="第二个数最小值")
    b_max: int = Field(20, ge=0, le=10000, description="第二个数最大值")
    operators: List[str] = Field(default_factory=lambda: ["+", "-"])
    no_negative: bool = Field(True, description="减法避免负数结果")
    carry_control: Dict[int, Literal["carry", "no_carry", "any"]] | None = Field(
        None, description="加法进位控制,键为数位(0=个位),值为carry/no_carry/any"
    )
    borrow_control: Dict[int, Literal["borrow", "no_borrow", "any"]] | None = Field(
        None, description="减法退位控制,键为数位,值为borrow/no_borrow/any"
    )


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/api/generate")
def api_generate(req: GenerateRequest):
    # 调试日志
    print(f"收到请求: carry_control={req.carry_control}, borrow_control={req.borrow_control}")
    try:
        problems = generate(
            req.count,
            req.a_min,
            req.a_max,
            req.b_min,
            req.b_max,
            req.operators,
            req.no_negative,
            req.carry_control,
            req.borrow_control,
        )
        print(f"生成 {len(problems)} 道题")
        # 调试:检查前3道题的进位情况
        for i, p in enumerate(problems[:3]):
            if p.op == "+":
                ones = (p.a % 10) + (p.b % 10)
                print(f"  题{i+1}: {p.text} 个位{p.a%10}+{p.b%10}={ones} {'进位' if ones>=10 else '不进位'}")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"problems": [p.to_dict() for p in problems]}
