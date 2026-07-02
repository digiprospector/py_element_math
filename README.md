# py_element_math — 小学数学口算题目生成器

一个带 Web 界面的小学数学口算题目生成器,基于 **FastAPI**。

## 功能

- 自定义**题目数量**、操作数的**数值范围**(最小值 / 最大值)
- 自选**运算类型**:加法、减法、乘法、除法(可多选,每题随机)
- **避免负数结果**:减法自动保证被减数 ≥ 减数;除法保证整除、除数不为 0
- **显示 / 隐藏答案**一键切换
- **在线作答判分**:填入答案后自动批改并统计得分
- **打印友好排版**:打印时隐藏控件,保留答题横线,并带姓名 / 日期 / 得分栏

## 安装

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# 或 Git Bash / Linux / macOS
# source .venv/bin/activate

pip install -e .
```

## 运行

```bash
# 方式一:使用安装的命令
oral-math                 # 默认 http://127.0.0.1:8000
oral-math --reload        # 开发模式,自动重载
oral-math --host 0.0.0.0 --port 9000

# 方式二:直接用 uvicorn
uvicorn app.main:app --reload
```

打开浏览器访问 http://127.0.0.1:8000 即可。

## 测试

```bash
pip install -e ".[dev]"
pytest
```

## 项目结构

```
app/
  main.py            FastAPI 应用与 /api/generate 接口
  generator.py       口算题目生成逻辑
  cli.py             命令行启动入口
  templates/index.html
  static/style.css
  static/app.js
tests/
  test_generator.py
```
