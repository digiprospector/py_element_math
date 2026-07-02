"""口算题目生成逻辑。

生成「两个操作数 + 一种运算」形式的口算题。两个操作数各自拥有独立的
取值范围,参与的运算类型由调用方(即用户在网页上)决定。
支持避免负数结果、除法保证整除、加法进位控制、减法退位控制。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Literal

# 支持的运算符及其在题面上显示的符号
OP_SYMBOLS = {"+": "+", "-": "−", "*": "×", "/": "÷"}
OPERATORS = set(OP_SYMBOLS)

CarryMode = Literal["carry", "no_carry", "any"]  # 进位、不进位、随机
BorrowMode = Literal["borrow", "no_borrow", "any"]  # 退位、不退位、随机


@dataclass
class Problem:
    """一道口算题。"""

    a: int
    b: int
    op: str
    answer: int | str

    @property
    def text(self) -> str:
        """题面文本,例如 ``3 + 5 =``。"""
        return f"{self.a} {OP_SYMBOLS[self.op]} {self.b} ="

    def to_dict(self) -> dict:
        return {
            "a": self.a,
            "b": self.b,
            "op": self.op,
            "symbol": OP_SYMBOLS[self.op],
            "text": self.text,
            "answer": self.answer,
        }


def _get_digit(n: int, pos: int) -> int:
    """取数字 n 在 pos 位的数字(0=个位,1=十位,...)。"""
    return (abs(n) // (10**pos)) % 10


def _check_carry_at(a: int, b: int, pos: int) -> bool:
    """检查加法在 pos 位是否进位。"""
    da = _get_digit(a, pos)
    db = _get_digit(b, pos)
    carry_in = 1 if pos > 0 and _check_carry_at(a, b, pos - 1) else 0
    return da + db + carry_in >= 10


def _check_borrow_at(a: int, b: int, pos: int) -> bool:
    """检查减法在 pos 位是否退位。"""
    da = _get_digit(a, pos)
    db = _get_digit(b, pos)
    borrow_in = 1 if pos > 0 and _check_borrow_at(a, b, pos - 1) else 0
    return da - borrow_in < db


def _make_addition(
    a_min: int,
    a_max: int,
    b_min: int,
    b_max: int,
    carry_control: dict[int, CarryMode] | None,
) -> Problem:
    """生成一道加法题,可选进位控制。"""
    max_attempts = 500
    for _ in range(max_attempts):
        a = random.randint(a_min, a_max)
        b = random.randint(b_min, b_max)
        if carry_control:
            ok = True
            for pos, mode in carry_control.items():
                pos = int(pos)  # 确保 pos 是整数
                has_carry = _check_carry_at(a, b, pos)
                if mode == "carry" and not has_carry:
                    ok = False
                    break
                if mode == "no_carry" and has_carry:
                    ok = False
                    break
            if not ok:
                continue
        return Problem(a, b, "+", a + b)
    # 超过尝试次数,返回最后一次
    return Problem(a, b, "+", a + b)


def _make_subtraction(
    a_min: int,
    a_max: int,
    b_min: int,
    b_max: int,
    no_negative: bool,
    borrow_control: dict[int, BorrowMode] | None,
) -> Problem:
    """生成一道减法题,可选退位控制。"""
    max_attempts = 500
    for _ in range(max_attempts):
        a = random.randint(a_min, a_max)
        if no_negative:
            hi = min(b_max, a)
            if hi >= b_min:
                b = random.randint(b_min, hi)
            else:
                b = random.randint(b_min, b_max)
                if a < b:
                    a, b = b, a
        else:
            b = random.randint(b_min, b_max)

        if borrow_control:
            ok = True
            for pos, mode in borrow_control.items():
                pos = int(pos)  # 确保 pos 是整数
                has_borrow = _check_borrow_at(a, b, pos)
                if mode == "borrow" and not has_borrow:
                    ok = False
                    break
                if mode == "no_borrow" and has_borrow:
                    ok = False
                    break
            if not ok:
                continue
        return Problem(a, b, "-", a - b)
    return Problem(a, b, "-", a - b)


def _make_one(
    a_min: int,
    a_max: int,
    b_min: int,
    b_max: int,
    op: str,
    no_negative: bool,
    carry_control: dict[int, CarryMode] | None,
    borrow_control: dict[int, BorrowMode] | None,
    division_control: Literal["no_remainder", "with_remainder", "any"] = "any",
) -> Problem:
    """按指定运算生成一道题,两个操作数各取自己的范围。"""
    if op == "+":
        return _make_addition(a_min, a_max, b_min, b_max, carry_control)

    if op == "-":
        return _make_subtraction(a_min, a_max, b_min, b_max, no_negative, borrow_control)

    if op == "*":
        a = random.randint(a_min, a_max)
        b = random.randint(b_min, b_max)
        return Problem(a, b, op, a * b)

    if op == "/":
        if division_control == "with_remainder":
            max_attempts = 500
            for _ in range(max_attempts):
                div_min = max(2, b_min)
                div_max = max(2, b_max)
                if div_min > div_max:
                    divisor = div_min
                else:
                    divisor = random.randint(div_min, div_max)
                
                a = random.randint(a_min, a_max)
                q = a // divisor
                r = a % divisor
                if r > 0:
                    return Problem(a, divisor, op, f"{q}......{r}")
            
            # Fallback
            divisor = random.randint(max(2, b_min), max(2, b_max))
            a = random.randint(a_min, a_max)
            q = a // divisor
            r = a % divisor
            if r > 0:
                return Problem(a, divisor, op, f"{q}......{r}")
            return Problem(a, divisor, op, q)
        elif division_control == "no_remainder":
            divisor = random.randint(max(1, b_min), max(1, b_max))
            q_lo = math.ceil(a_min / divisor)
            q_hi = math.floor(a_max / divisor)
            quotient = random.randint(q_lo, q_hi) if q_hi >= q_lo else q_lo
            dividend = divisor * quotient
            return Problem(dividend, divisor, op, quotient)
        else:
            # any
            if random.choice([True, False]):
                div_min = max(2, b_min)
                div_max = max(2, b_max)
                divisor = random.randint(div_min, div_max) if div_max >= div_min else div_min
                a = random.randint(a_min, a_max)
                q = a // divisor
                r = a % divisor
                if r > 0:
                    return Problem(a, divisor, op, f"{q}......{r}")
            divisor = random.randint(max(1, b_min), max(1, b_max))
            q_lo = math.ceil(a_min / divisor)
            q_hi = math.floor(a_max / divisor)
            quotient = random.randint(q_lo, q_hi) if q_hi >= q_lo else q_lo
            dividend = divisor * quotient
            return Problem(dividend, divisor, op, quotient)

    raise ValueError(f"不支持的运算符: {op!r}")


def _problem_key(problem: Problem) -> tuple[int, str, int]:
    return (problem.a, problem.op, problem.b)


def generate(
    count: int,
    a_min: int,
    a_max: int,
    b_min: int,
    b_max: int,
    operators,
    no_negative: bool = True,
    carry_control: dict[int, CarryMode] | None = None,
    borrow_control: dict[int, BorrowMode] | None = None,
    division_control: Literal["no_remainder", "with_remainder", "any"] = "any",
) -> list[Problem]:
    """生成 ``count`` 道口算题。

    - ``a_min`` / ``a_max``:第一个操作数的取值范围(闭区间),顺序可颠倒。
    - ``b_min`` / ``b_max``:第二个操作数的取值范围(闭区间),顺序可颠倒。
    - ``operators``:可用运算符列表,每题从中随机选一种。
    - ``no_negative``:为 ``True`` 时减法结果不会为负。
    - ``carry_control``:加法进位控制,键为数位(0=个位,1=十位),值为 "carry"/"no_carry"/"any"。
    - ``borrow_control``:减法退位控制,键为数位,值为 "borrow"/"no_borrow"/"any"。
    """
    if count <= 0:
        return []
    if a_min > a_max:
        a_min, a_max = a_max, a_min
    if b_min > b_max:
        b_min, b_max = b_max, b_min

    ops = [o for o in operators if o in OPERATORS]
    if not ops:
        raise ValueError("至少需要选择一种运算")

    # 过滤掉 "any" 模式的控制,简化生成逻辑
    carry_ctrl = (
        {k: v for k, v in carry_control.items() if v != "any"}
        if carry_control
        else None
    )
    borrow_ctrl = (
        {k: v for k, v in borrow_control.items() if v != "any"}
        if borrow_control
        else None
    )

    problems: list[Problem] = []
    seen: set[tuple[int, str, int]] = set()
    max_attempts = max(1000, count * 200)

    for _ in range(max_attempts):
        problem = _make_one(
            a_min,
            a_max,
            b_min,
            b_max,
            random.choice(ops),
            no_negative,
            carry_ctrl,
            borrow_ctrl,
            division_control,
        )
        key = _problem_key(problem)
        if key in seen:
            continue
        seen.add(key)
        problems.append(problem)
        if len(problems) == count:
            return problems

    raise ValueError("可生成的不重复题目数量不足，请扩大范围或减少题目数量")
