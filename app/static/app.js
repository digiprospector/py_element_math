"use strict";

// 当前生成的题目(含答案),供判分与显示答案使用
let currentGroups = [];
let answersShown = false;

const $ = (sel) => document.querySelector(sel);

const form = $("#config-form");
const problemGroupsEl = $("#problem-groups");
const toolbar = $("#toolbar");
const toggleBtn = $("#toggle-answers");
const gradeBtn = $("#grade");
const printBtn = $("#print");
const scoreEl = $("#score");
const messageEl = $("#message");

// 数字范围输入框
const aMinInput = $("#a_min");
const aMaxInput = $("#a_max");
const bMinInput = $("#b_min");
const bMaxInput = $("#b_max");

// 进位/退位控制区
const carrySection = $("#carry-section");
const borrowSection = $("#borrow-section");
const carryDigits = $("#carry-digits");
const borrowDigits = $("#borrow-digits");

const DIGIT_NAMES = ["个位", "十位", "百位", "千位", "万位"];

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await generate();
});

// 监听范围变化,动态更新进位/退位控制
[aMinInput, aMaxInput, bMinInput, bMaxInput].forEach((input) => {
  input.addEventListener("input", updateCarryBorrowControls);
});

// 监听运算符勾选变化
document.querySelectorAll('input[name="op"]').forEach((cb) => {
  cb.addEventListener("change", updateCarryBorrowControls);
});

// 初始化时更新一次
updateCarryBorrowControls();

function updateCarryBorrowControls() {
  const aMin = Number(aMinInput.value);
  const aMax = Number(aMaxInput.value);
  const bMin = Number(bMinInput.value);
  const bMax = Number(bMaxInput.value);

  const hasAdd = document.querySelector('input[name="op"][value="+"]:checked');
  const hasSub = document.querySelector('input[name="op"][value="-"]:checked');

  // 计算最大可能的数值范围
  const maxNum = Math.max(aMax, bMax, aMax + bMax);
  const maxDigits = maxNum > 0 ? Math.floor(Math.log10(maxNum)) + 1 : 1;

  console.log(`范围检测: aMax=${aMax}, bMax=${bMax}, maxNum=${maxNum}, maxDigits=${maxDigits}`);

  // 显示/隐藏加法进位控制
  if (hasAdd && maxDigits > 1) {
    carrySection.classList.remove("hidden");
    renderDigitControls(carryDigits, maxDigits - 1, "carry");
    console.log(`显示加法进位控制,渲染 ${maxDigits - 1} 个数位`);
  } else {
    carrySection.classList.add("hidden");
  }

  // 显示/隐藏减法退位控制
  if (hasSub && maxDigits > 1) {
    borrowSection.classList.remove("hidden");
    renderDigitControls(borrowDigits, maxDigits - 1, "borrow");
  } else {
    borrowSection.classList.add("hidden");
  }
}

function renderDigitControls(container, numDigits, type) {
  // 保留已有的勾选状态
  const existing = {};
  container.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    const pos = Number(cb.dataset.pos);
    const mode = cb.dataset.mode;
    if (!existing[pos]) existing[pos] = {};
    existing[pos][mode] = cb.checked;
  });

  container.innerHTML = "";
  for (let i = 0; i < numDigits; i++) {
    const group = document.createElement("div");
    group.className = "digit-group";

    const title = document.createElement("span");
    title.className = "digit-title";
    title.textContent = DIGIT_NAMES[i] || `${i}位`;

    const options = document.createElement("div");
    options.className = "digit-options";

    // 第一个选项(进位/退位)
    const label1 = document.createElement("label");
    const cb1 = document.createElement("input");
    cb1.type = "checkbox";
    cb1.dataset.pos = String(i);
    cb1.dataset.type = type;
    cb1.dataset.mode = type === "carry" ? "carry" : "borrow";
    if (existing[i]?.[cb1.dataset.mode]) cb1.checked = true;
    label1.appendChild(cb1);
    label1.appendChild(document.createTextNode(type === "carry" ? " 进位" : " 退位"));

    // 第二个选项(不进位/不退位)
    const label2 = document.createElement("label");
    const cb2 = document.createElement("input");
    cb2.type = "checkbox";
    cb2.dataset.pos = String(i);
    cb2.dataset.type = type;
    cb2.dataset.mode = type === "carry" ? "no_carry" : "no_borrow";
    if (existing[i]?.[cb2.dataset.mode]) cb2.checked = true;
    label2.appendChild(cb2);
    label2.appendChild(document.createTextNode(type === "carry" ? " 不进位" : " 不退位"));

    // 不互斥,两个可以同时勾选

    options.append(label1, label2);
    group.append(title, options);
    container.appendChild(group);
  }
}

toggleBtn.addEventListener("click", () => {
  answersShown = !answersShown;
  document.querySelectorAll(".correct").forEach((el) => {
    el.classList.toggle("hidden", !answersShown);
  });
  toggleBtn.textContent = answersShown ? "隐藏答案" : "显示答案";
});

gradeBtn.addEventListener("click", grade);
printBtn.addEventListener("click", () => window.print());

async function generate() {
  messageEl.textContent = "";
  const operators = Array.from(
    document.querySelectorAll('input[name="op"]:checked')
  ).map((el) => el.value);

  if (operators.length === 0) {
    messageEl.textContent = "请至少选择一种运算类型。";
    return;
  }

  // 收集进位控制:按数位分组检查
  const carryControl = {};
  const carryByPos = {};
  carryDigits.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    const pos = Number(cb.dataset.pos);
    const mode = cb.dataset.mode;
    if (!carryByPos[pos]) carryByPos[pos] = {};
    if (cb.checked) {
      carryByPos[pos][mode] = true;
    }
  });
  // 判断每个数位的模式
  for (const pos in carryByPos) {
    const modes = carryByPos[pos];
    const hasCarry = modes.carry;
    const hasNoCarry = modes.no_carry;
    if (hasCarry && hasNoCarry) {
      carryControl[pos] = "any";  // 两个都勾 = 随机
    } else if (hasCarry) {
      carryControl[pos] = "carry";
    } else if (hasNoCarry) {
      carryControl[pos] = "no_carry";
    }
    // 都不勾 = 不添加到 carryControl,等同于 "any"
  }

  // 收集退位控制:同样逻辑
  const borrowControl = {};
  const borrowByPos = {};
  borrowDigits.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    const pos = Number(cb.dataset.pos);
    const mode = cb.dataset.mode;
    if (!borrowByPos[pos]) borrowByPos[pos] = {};
    if (cb.checked) {
      borrowByPos[pos][mode] = true;
    }
  });
  for (const pos in borrowByPos) {
    const modes = borrowByPos[pos];
    const hasBorrow = modes.borrow;
    const hasNoBorrow = modes.no_borrow;
    if (hasBorrow && hasNoBorrow) {
      borrowControl[pos] = "any";
    } else if (hasBorrow) {
      borrowControl[pos] = "borrow";
    } else if (hasNoBorrow) {
      borrowControl[pos] = "no_borrow";
    }
  }

  const perGroupCount = Number($("#count").value);
  const groupCount = Math.max(1, Number($("#group_count").value) || 1);
  const totalCount = perGroupCount * groupCount;
  const payload = {
    count: perGroupCount,
    a_min: Number($("#a_min").value),
    a_max: Number($("#a_max").value),
    b_min: Number($("#b_min").value),
    b_max: Number($("#b_max").value),
    operators,
    no_negative: $("#no_negative").checked,
    carry_control: Object.keys(carryControl).length > 0 ? carryControl : null,
    borrow_control: Object.keys(borrowControl).length > 0 ? borrowControl : null,
  };

  console.log("发送参数:", JSON.stringify(payload, null, 2));

  const allProblems = [];
  const seen = new Set();
  let attempts = 0;
  while (allProblems.length < totalCount && attempts < 30) {
    attempts += 1;
    const batchCount = Math.min(200, totalCount - allProblems.length);
    let resp;
    try {
      resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, count: batchCount }),
      });
    } catch (err) {
      messageEl.textContent = "网络请求失败:" + err;
      return;
    }

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      messageEl.textContent = "生成失败:" + (data.detail || resp.status);
      return;
    }

    const data = await resp.json();
    data.problems.forEach((problem) => {
      const key = `${problem.a}|${problem.op}|${problem.b}`;
      if (!seen.has(key) && allProblems.length < totalCount) {
        seen.add(key);
        allProblems.push(problem);
      }
    });
  }

  if (allProblems.length < totalCount) {
    messageEl.textContent = "可生成的不重复题目数量不足，请扩大范围或减少题目数量";
    return;
  }

  const groups = [];
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    const start = groupIndex * perGroupCount;
    groups.push(allProblems.slice(start, start + perGroupCount));
  }

  currentGroups = groups;
  render();
}

function render() {
  problemGroupsEl.innerHTML = "";
  answersShown = false;
  toggleBtn.textContent = "显示答案";
  scoreEl.textContent = "";

  currentGroups.forEach((groupProblems, groupIndex) => {
    const section = document.createElement("section");
    section.className = "problem-group";

    const header = document.createElement("div");
    header.className = "print-header print-only";
    header.innerHTML = [
      '<div class="field">姓名:______________</div>',
      '<div class="field">日期:______________</div>',
      '<div class="field">得分:______________</div>',
    ].join("");

    const list = document.createElement("ol");
    list.className = "problems";

    groupProblems.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "problem";

      const q = document.createElement("span");
      q.className = "q";
      q.textContent = p.text;

      const input = document.createElement("input");
      input.className = "ans";
      input.type = "number";
      input.dataset.index = String(i);
      input.dataset.group = String(groupIndex);
      input.setAttribute("aria-label", "答案");

      const correct = document.createElement("span");
      correct.className = "correct hidden";
      correct.textContent = p.answer;

      const mark = document.createElement("span");
      mark.className = "mark";

      li.append(q, input, correct, mark);
      list.appendChild(li);
    });

    section.append(header, list);
    problemGroupsEl.appendChild(section);
  });

  toolbar.classList.remove("hidden");
}
function grade() {
  const firstGroupProblems = currentGroups[0] || [];
  if (firstGroupProblems.length === 0) return;
  const firstGroup = problemGroupsEl.querySelector(".problem-group");
  if (!firstGroup) return;

  let correctCount = 0;
  let answered = 0;

  firstGroup.querySelectorAll("li").forEach((li, i) => {
    const input = li.querySelector(".ans");
    const mark = li.querySelector(".mark");
    const val = input.value.trim();

    input.classList.remove("right", "wrong");
    mark.classList.remove("right", "wrong");

    if (val === "") {
      mark.textContent = "";
      return;
    }
    answered += 1;
    const ok = Number(val) === firstGroupProblems[i].answer;
    if (ok) {
      correctCount += 1;
      mark.textContent = "✓";
      mark.classList.add("right");
      input.classList.add("right");
    } else {
      mark.textContent = "✗";
      mark.classList.add("wrong");
      input.classList.add("wrong");
    }
  });

  const total = firstGroupProblems.length;
  scoreEl.textContent = `已答 ${answered}/${total},正确 ${correctCount},得分 ${Math.round(
    (correctCount / total) * 100
  )} 分`;
}
