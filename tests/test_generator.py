"""generator 模块的单元测试。"""

from app.generator import generate


def test_count():
    assert len(generate(15, 0, 20, 0, 20, ["+"])) == 15
    assert generate(0, 0, 20, 0, 20, ["+"]) == []


def test_addition_answer_and_independent_ranges():
    for p in generate(200, 0, 20, 100, 200, ["+"]):
        assert p.op == "+"
        assert p.answer == p.a + p.b
        assert 0 <= p.a <= 20
        assert 100 <= p.b <= 200


def test_subtraction_no_negative():
    for p in generate(200, 0, 100, 0, 100, ["-"], no_negative=True):
        assert p.answer == p.a - p.b
        assert p.answer >= 0
        assert p.a >= p.b


def test_subtraction_can_allow_negative():
    seen_negative = False
    for p in generate(300, 0, 10, 0, 10, ["-"], no_negative=False):
        assert p.answer == p.a - p.b
        if p.answer < 0:
            seen_negative = True
    assert seen_negative


def test_multiplication():
    for p in generate(100, 1, 9, 1, 9, ["*"]):
        assert p.answer == p.a * p.b


def test_division_is_exact_and_no_zero_divisor():
    for p in generate(200, 0, 100, 1, 12, ["/"]):
        assert p.b != 0
        assert p.a == p.b * p.answer
        assert p.a % p.b == 0


def test_mixed_operators_only_selected():
    ops = {p.op for p in generate(300, 1, 20, 1, 20, ["+", "-"])}
    assert ops <= {"+", "-"}


def test_range_can_be_reversed():
    problems = generate(10, 20, 5, 30, 10, ["+"])
    assert len(problems) == 10


def test_empty_operators_raises():
    try:
        generate(5, 0, 10, 0, 10, [])
    except ValueError:
        pass
    else:
        raise AssertionError("空运算列表应抛出 ValueError")


def test_carry_control_ones_place_no_carry():
    """个位不进位:a的个位+b的个位<10"""
    problems = generate(50, 0, 99, 0, 99, ["+"], carry_control={0: "no_carry"})
    for p in problems:
        ones_sum = (p.a % 10) + (p.b % 10)
        assert ones_sum < 10, f"{p.a} + {p.b} 个位进位了"


def test_carry_control_ones_place_must_carry():
    """个位必须进位:a的个位+b的个位>=10"""
    problems = generate(50, 0, 99, 0, 99, ["+"], carry_control={0: "carry"})
    for p in problems:
        ones_sum = (p.a % 10) + (p.b % 10)
        assert ones_sum >= 10, f"{p.a} + {p.b} 个位没进位"


def test_borrow_control_ones_place_no_borrow():
    """个位不退位:a的个位>=b的个位"""
    problems = generate(50, 10, 99, 0, 99, ["-"], borrow_control={0: "no_borrow"})
    for p in problems:
        a_ones = p.a % 10
        b_ones = p.b % 10
        assert a_ones >= b_ones, f"{p.a} - {p.b} 个位退位了"


def test_borrow_control_ones_place_must_borrow():
    """个位必须退位:a的个位<b的个位"""
    problems = generate(50, 10, 99, 0, 99, ["-"], borrow_control={0: "borrow"})
    for p in problems:
        a_ones = p.a % 10
        b_ones = p.b % 10
        assert a_ones < b_ones, f"{p.a} - {p.b} 个位没退位"


def test_carry_control_tens_place():
    """十位必须进位"""
    problems = generate(30, 50, 99, 50, 99, ["+"], carry_control={1: "carry"})
    for p in problems:
        # 检查十位进位:需考虑个位的进位
        tens_a = (p.a // 10) % 10
        tens_b = (p.b // 10) % 10
        carry_from_ones = 1 if (p.a % 10) + (p.b % 10) >= 10 else 0
        assert tens_a + tens_b + carry_from_ones >= 10, f"{p.a} + {p.b} 十位没进位"
