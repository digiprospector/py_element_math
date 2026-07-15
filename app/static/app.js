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
const pdfBtn = $("#generate-pdf");
const scoreEl = $("#score");
const messageEl = $("#message");
const saveSettingsBtn = $("#save-settings");
const noNegativeOption = $("#no-negative-option");
const operatorTabs = Array.from(document.querySelectorAll(".operation-tab"));

let currentPageIndex = 0;
const paginationControls = $("#pagination-controls");
const prevPageBtn = $("#prev-page");
const nextPageBtn = $("#next-page");
const pageIndicator = $("#page-indicator");

// 进位/退位控制区
const carrySection = $("#carry-section");
const borrowSection = $("#borrow-section");
const carryDigits = $("#carry-digits");
const borrowDigits = $("#borrow-digits");

const DIGIT_NAMES = ["个位", "十位", "百位", "千位", "万位"];

let activeOperator = "+";

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await generate();
});

// 监听加法范围变化,动态更新进位控制
["add_a_min", "add_a_max", "add_b_min", "add_b_max"].forEach((id) => {
  const el = $("#" + id);
  if (el) el.addEventListener("input", updateCarryBorrowControls);
});
// 监听减法范围变化,动态更新退位控制
["sub_a_min", "sub_a_max", "sub_b_min", "sub_b_max"].forEach((id) => {
  const el = $("#" + id);
  if (el) el.addEventListener("input", updateCarryBorrowControls);
});

// 监听左侧运算类型 tab 切换
operatorTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveOperator(tab.dataset.op || "+");
  });
});

prevPageBtn.addEventListener("click", () => {
  if (currentPageIndex > 0) {
    currentPageIndex -= 1;
    updatePaginationUI();
    scoreEl.textContent = "";
  }
});

nextPageBtn.addEventListener("click", () => {
  if (currentPageIndex < currentGroups.length - 1) {
    currentPageIndex += 1;
    updatePaginationUI();
    scoreEl.textContent = "";
  }
});

// 初始化时更新一次
loadSettings().then(() => {
  updateCarryBorrowControls();
});

function setActiveOperator(operator) {
  activeOperator = operator === "-" ? "-" : (operator === "*" ? "*" : (operator === "/" ? "/" : "+"));
  operatorTabs.forEach((tab) => {
    const selected = tab.dataset.op === activeOperator;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  const currentOpLabel = $("#current-op-label");
  if (currentOpLabel) {
    currentOpLabel.textContent = activeOperator === "-" ? "−" : (activeOperator === "*" ? "×" : (activeOperator === "/" ? "÷" : "+"));
  }

  if (activeOperator === "+") {
    $("#add-settings-section").classList.remove("hidden");
    $("#sub-settings-section").classList.add("hidden");
    $("#mul-settings-section").classList.add("hidden");
    $("#div-settings-section").classList.add("hidden");
  } else if (activeOperator === "-") {
    $("#add-settings-section").classList.add("hidden");
    $("#sub-settings-section").classList.remove("hidden");
    $("#mul-settings-section").classList.add("hidden");
    $("#div-settings-section").classList.add("hidden");
  } else if (activeOperator === "*") {
    $("#add-settings-section").classList.add("hidden");
    $("#sub-settings-section").classList.add("hidden");
    $("#mul-settings-section").classList.remove("hidden");
    $("#div-settings-section").classList.add("hidden");
  } else if (activeOperator === "/") {
    $("#add-settings-section").classList.add("hidden");
    $("#sub-settings-section").classList.add("hidden");
    $("#mul-settings-section").classList.add("hidden");
    $("#div-settings-section").classList.remove("hidden");
  }
}


function updateCarryBorrowControls() {
  // 加法进位控制:基于加法范围
  const addAMax = Number($("#add_a_max")?.value || 0);
  const addBMax = Number($("#add_b_max")?.value || 0);
  const addMax = Math.max(addAMax, addBMax, addAMax + addBMax);
  const addDigits = addMax > 0 ? Math.floor(Math.log10(addMax)) + 1 : 1;

  // 减法退位控制:基于减法范围
  const subAMax = Number($("#sub_a_max")?.value || 0);
  const subBMax = Number($("#sub_b_max")?.value || 0);
  const subMax = Math.max(subAMax, subBMax, subAMax + subBMax);
  const subDigits = subMax > 0 ? Math.floor(Math.log10(subMax)) + 1 : 1;

  if (addDigits > 1) {
    renderDigitControls(carryDigits, addDigits - 1, "carry");
    carrySection.classList.remove("hidden");
  } else {
    carrySection.classList.add("hidden");
  }

  if (subDigits > 1) {
    renderDigitControls(borrowDigits, subDigits - 1, "borrow");
    borrowSection.classList.remove("hidden");
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
    else if (window.loadedSettings) {
      const loaded = type === "carry" ? window.loadedSettings.carry_control : window.loadedSettings.borrow_control;
      if (loaded && (loaded[i] === cb1.dataset.mode || loaded[i] === "any")) cb1.checked = true;
    }
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
    else if (window.loadedSettings) {
      const loaded = type === "carry" ? window.loadedSettings.carry_control : window.loadedSettings.borrow_control;
      if (loaded && (loaded[i] === cb2.dataset.mode || loaded[i] === "any")) cb2.checked = true;
    }
    label2.appendChild(cb2);
    label2.appendChild(document.createTextNode(type === "carry" ? " 不进位" : " 不退位"));

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
pdfBtn.addEventListener("click", generatePDF);

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function fetchProblems(count, op, specificPayload) {
  const allProblems = [];
  const seen = new Set();
  let attempts = 0;

  while (allProblems.length < count && attempts < 30) {
    attempts += 1;
    const batchCount = Math.min(200, count - allProblems.length);
    const body = {
      ...specificPayload,
      count: batchCount,
      operators: [op],
    };

    let resp;
    try {
      resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`网络请求失败: ${err.message}`);
    }

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `HTTP ${resp.status}`);
    }

    const data = await resp.json();
    data.problems.forEach((problem) => {
      const key = `${problem.a}|${problem.op}|${problem.b}`;
      if (!seen.has(key) && allProblems.length < count) {
        seen.add(key);
        allProblems.push(problem);
      }
    });
  }

  if (allProblems.length < count) {
    const opName = op === "+" ? "加法" : (op === "-" ? "减法" : (op === "*" ? "乘法" : "除法"));
    throw new Error(`可生成的 ${opName} 题目数量不足，请扩大范围或减少题目数量`);
  }
  return allProblems;
}

async function generate() {
  messageEl.textContent = "";
  const addCount = Number($("#add_count").value) || 0;
  const subCount = Number($("#sub_count").value) || 0;
  const mulCount = Number($("#mul_count").value) || 0;
  const divCount = Number($("#div_count").value) || 0;
  const groupCount = Math.max(1, Number($("#group_count").value) || 1);

  if (addCount === 0 && subCount === 0 && mulCount === 0 && divCount === 0) {
    messageEl.textContent = "加法、减法、乘法和除法数量不能同时为 0。";
    return;
  }

  const payload = getPayload();

  let allAddProblems = [];
  let allSubProblems = [];
  let allMulProblems = [];
  let allDivProblems = [];

  try {
    if (addCount > 0) {
      const addPayload = {
        a_min: Number($("#add_a_min").value),
        a_max: Number($("#add_a_max").value),
        b_min: Number($("#add_b_min").value),
        b_max: Number($("#add_b_max").value),
        carry_control: payload.carry_control,
      };
      allAddProblems = await fetchProblems(addCount * groupCount, "+", addPayload);
    }
    if (subCount > 0) {
      const subPayload = {
        a_min: Number($("#sub_a_min").value),
        a_max: Number($("#sub_a_max").value),
        b_min: Number($("#sub_b_min").value),
        b_max: Number($("#sub_b_max").value),
        borrow_control: payload.borrow_control,
        no_negative: payload.no_negative,
      };
      allSubProblems = await fetchProblems(subCount * groupCount, "-", subPayload);
    }
    if (mulCount > 0) {
      const mulPayload = {
        a_min: Number($("#mul_a_min").value),
        a_max: Number($("#mul_a_max").value),
        b_min: Number($("#mul_b_min").value),
        b_max: Number($("#mul_b_max").value),
      };
      allMulProblems = await fetchProblems(mulCount * groupCount, "*", mulPayload);
    }
    if (divCount > 0) {
      const divPayload = {
        a_min: Number($("#div_a_min").value),
        a_max: Number($("#div_a_max").value),
        b_min: Number($("#div_b_min").value),
        b_max: Number($("#div_b_max").value),
        division_control: payload.division_control,
      };
      allDivProblems = await fetchProblems(divCount * groupCount, "/", divPayload);
    }
  } catch (err) {
    messageEl.textContent = "生成失败: " + err.message;
    return;
  }

  const groups = [];
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    const groupAdd = allAddProblems.slice(groupIndex * addCount, (groupIndex + 1) * addCount);
    const groupSub = allSubProblems.slice(groupIndex * subCount, (groupIndex + 1) * subCount);
    const groupMul = allMulProblems.slice(groupIndex * mulCount, (groupIndex + 1) * mulCount);
    const groupDiv = allDivProblems.slice(groupIndex * divCount, (groupIndex + 1) * divCount);
    const groupProblems = shuffle([...groupAdd, ...groupSub, ...groupMul, ...groupDiv]);
    groups.push(groupProblems);
  }

  currentGroups = groups;
  currentPageIndex = 0;
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

    // GUI only header
    const guiHeader = document.createElement("h3");
    guiHeader.className = "group-title no-print";
    guiHeader.textContent = `第 ${groupIndex + 1} 组`;
    section.appendChild(guiHeader);

    const header = document.createElement("div");
    header.className = "print-header print-only";
    header.innerHTML = [
      '<div class="field">姓名:______________</div>',
      '<div class="field">日期:______________</div>',
      '<div class="field">得分:______________</div>',
    ].join("");

    const list = document.createElement("ol");
    list.className = "problems";

    const totalCount = groupProblems.length;
    const maxDigits = Math.max(2, String(totalCount).length); // 至少补齐到两位 (如 01. 02.)

    groupProblems.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "problem";

      // 创建序号 span 并根据数量前补 0
      const seq = document.createElement("span");
      seq.className = "seq";
      seq.textContent = `(${String(i + 1).padStart(maxDigits, "0")}) `;

      const q = document.createElement("span");
      q.className = "q";
      q.textContent = p.text;

      const input = document.createElement("input");
      input.className = "ans";
      const isRemainderDiv = p.op === "/" && String(p.answer).includes(".");
      input.type = isRemainderDiv ? "text" : "number";
      input.dataset.index = String(i);
      input.dataset.group = String(groupIndex);
      input.setAttribute("aria-label", "答案");

      const correct = document.createElement("span");
      correct.className = "correct hidden";
      correct.textContent = p.answer;

      const mark = document.createElement("span");
      mark.className = "mark";

      li.append(seq, q, input, correct, mark);
      list.appendChild(li);
    });

    section.append(header, list);
    problemGroupsEl.appendChild(section);
  });

  // 智能分页：估算每组在 A4 页面上的占用高度(mm)，累积超出时插入分页标记
  insertSmartPageBreaks();

  if (currentGroups.length > 1) {
    paginationControls.classList.remove("hidden");
  } else {
    paginationControls.classList.add("hidden");
  }
  updatePaginationUI();

  toolbar.classList.remove("hidden");
}

function updatePaginationUI() {
  const groups = problemGroupsEl.querySelectorAll(".problem-group");
  groups.forEach((group, index) => {
    if (index === currentPageIndex) {
      group.classList.add("active");
    } else {
      group.classList.remove("active");
    }
  });

  pageIndicator.textContent = `第 ${currentPageIndex + 1} 页 / 共 ${currentGroups.length} 页`;
  prevPageBtn.disabled = currentPageIndex === 0;
  nextPageBtn.disabled = currentPageIndex === currentGroups.length - 1;
}

function isAnswerCorrect(userInput, correctAnswer) {
  const cleanInput = String(userInput).trim();
  const cleanCorrect = String(correctAnswer).trim();

  if (cleanInput === cleanCorrect) return true;

  const inputNums = cleanInput.match(/\d+/g);
  const correctNums = cleanCorrect.match(/\d+/g);

  if (inputNums && correctNums && inputNums.length === correctNums.length) {
    return inputNums.every((num, idx) => Number(num) === Number(correctNums[idx]));
  }

  return false;
}

function grade() {
  const currentGroupProblems = currentGroups[currentPageIndex] || [];
  if (currentGroupProblems.length === 0) return;
  const groups = problemGroupsEl.querySelectorAll(".problem-group");
  const currentGroupEl = groups[currentPageIndex];
  if (!currentGroupEl) return;

  let correctCount = 0;
  let answered = 0;

  currentGroupEl.querySelectorAll("li").forEach((li, i) => {
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
    const ok = isAnswerCorrect(val, currentGroupProblems[i].answer);
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

  const total = currentGroupProblems.length;
  scoreEl.textContent = `第 ${currentPageIndex + 1} 页：已答 ${answered}/${total},正确 ${correctCount},得分 ${Math.round(
    (correctCount / total) * 100
  )} 分`;
}


saveSettingsBtn.addEventListener("click", async () => {
  const payload = getPayload();
  try {
    const resp = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (resp.ok) {
      alert("设定保存成功！");
    } else {
      const errText = await resp.text();
      alert("设定保存失败！" + errText);
    }
  } catch (err) {
    alert("网络请求失败:" + err);
  }
});

async function loadSettings() {
  try {
    const resp = await fetch("/api/settings");
    if (!resp.ok) return;
    const settings = await resp.json();
    window.loadedSettings = settings;

    // populate inputs
    if (settings.add_count !== undefined) $("#add_count").value = settings.add_count;
    if (settings.add_a_min !== undefined) $("#add_a_min").value = settings.add_a_min;
    if (settings.add_a_max !== undefined) $("#add_a_max").value = settings.add_a_max;
    if (settings.add_b_min !== undefined) $("#add_b_min").value = settings.add_b_min;
    if (settings.add_b_max !== undefined) $("#add_b_max").value = settings.add_b_max;

    if (settings.sub_count !== undefined) $("#sub_count").value = settings.sub_count;
    if (settings.sub_a_min !== undefined) $("#sub_a_min").value = settings.sub_a_min;
    if (settings.sub_a_max !== undefined) $("#sub_a_max").value = settings.sub_a_max;
    if (settings.sub_b_min !== undefined) $("#sub_b_min").value = settings.sub_b_min;
    if (settings.sub_b_max !== undefined) $("#sub_b_max").value = settings.sub_b_max;

    if (settings.mul_count !== undefined) $("#mul_count").value = settings.mul_count;
    if (settings.mul_a_min !== undefined) $("#mul_a_min").value = settings.mul_a_min;
    if (settings.mul_a_max !== undefined) $("#mul_a_max").value = settings.mul_a_max;
    if (settings.mul_b_min !== undefined) $("#mul_b_min").value = settings.mul_b_min;
    if (settings.mul_b_max !== undefined) $("#mul_b_max").value = settings.mul_b_max;

    if (settings.div_count !== undefined) $("#div_count").value = settings.div_count;
    if (settings.div_a_min !== undefined) $("#div_a_min").value = settings.div_a_min;
    if (settings.div_a_max !== undefined) $("#div_a_max").value = settings.div_a_max;
    if (settings.div_b_min !== undefined) $("#div_b_min").value = settings.div_b_min;
    if (settings.div_b_max !== undefined) $("#div_b_max").value = settings.div_b_max;

    if (settings.group_count !== undefined) $("#group_count").value = settings.group_count;
    if (settings.no_negative !== undefined) $("#no_negative").checked = settings.no_negative;
    if (settings.division_control !== undefined) {
      const val = settings.division_control;
      if (val === "no_remainder") {
        $("#div_no_remainder").checked = true;
        $("#div_with_remainder").checked = false;
      } else if (val === "with_remainder") {
        $("#div_no_remainder").checked = false;
        $("#div_with_remainder").checked = true;
      } else {
        $("#div_no_remainder").checked = true;
        $("#div_with_remainder").checked = true;
      }
    }

    setActiveOperator(activeOperator);
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

function getPayload() {
  const operators = ["+", "-", "*", "/"];

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

  const divNoRemainder = $("#div_no_remainder").checked;
  const divWithRemainder = $("#div_with_remainder").checked;
  let divisionControl = "any";
  if (divNoRemainder && !divWithRemainder) {
    divisionControl = "no_remainder";
  } else if (!divNoRemainder && divWithRemainder) {
    divisionControl = "with_remainder";
  }

  const add_count = Number($("#add_count").value) || 0;
  const sub_count = Number($("#sub_count").value) || 0;
  const mul_count = Number($("#mul_count").value) || 0;
  const div_count = Number($("#div_count").value) || 0;

  return {
    count: add_count + sub_count + mul_count + div_count,
    add_count,
    add_a_min: Number($("#add_a_min").value),
    add_a_max: Number($("#add_a_max").value),
    add_b_min: Number($("#add_b_min").value),
    add_b_max: Number($("#add_b_max").value),
    sub_count,
    sub_a_min: Number($("#sub_a_min").value),
    sub_a_max: Number($("#sub_a_max").value),
    sub_b_min: Number($("#sub_b_min").value),
    sub_b_max: Number($("#sub_b_max").value),
    mul_count,
    mul_a_min: Number($("#mul_a_min").value),
    mul_a_max: Number($("#mul_a_max").value),
    mul_b_min: Number($("#mul_b_min").value),
    mul_b_max: Number($("#mul_b_max").value),
    div_count,
    div_a_min: Number($("#div_a_min").value),
    div_a_max: Number($("#div_a_max").value),
    div_b_min: Number($("#div_b_min").value),
    div_b_max: Number($("#div_b_max").value),
    group_count: Number($("#group_count").value) || 1,
    operators,
    no_negative: $("#no_negative").checked,
    division_control: divisionControl,
    carry_control: Object.keys(carryControl).length > 0 ? carryControl : null,
    borrow_control: Object.keys(borrowControl).length > 0 ? borrowControl : null,
  };
}

async function generatePDF() {
  if (currentGroups.length === 0) {
    messageEl.textContent = "请先生成题目再导出 PDF";
    return;
  }

  pdfBtn.disabled = true;
  pdfBtn.textContent = "生成中…";
  messageEl.textContent = "";

  try {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

    // 进入 PDF 渲染模式 (在 body 和容器上添加类名，应用专门为 PDF 渲染准备的 CSS)
    document.body.classList.add("pdf-mode");
    problemGroupsEl.classList.add("pdf-mode");

    const pdfOpts = {
      margin: [15, 10, 15, 10],
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] }
    };

    // ── PDF 1：不含答案 ──
    document.querySelectorAll(".ans").forEach((el) => {
      el.style.setProperty("display", "inline-block", "important");
    });
    document.querySelectorAll(".correct").forEach((el) => {
      el.style.setProperty("display", "none", "important");
    });
    await html2pdf()
      .set({ ...pdfOpts, filename: `口算题_${dateStr}.pdf` })
      .from(problemGroupsEl)
      .save();

    await new Promise((r) => setTimeout(r, 600));

    // ── PDF 2：含答案 (隐藏下划线输入框，让正确答案紧跟等号后) ──
    document.querySelectorAll(".ans").forEach((el) => {
      el.style.setProperty("display", "none", "important");
    });
    document.querySelectorAll(".correct").forEach((el) => {
      el.style.setProperty("display", "inline-block", "important");
    });
    await html2pdf()
      .set({ ...pdfOpts, filename: `口算题_答案_${dateStr}.pdf` })
      .from(problemGroupsEl)
      .save();

    messageEl.textContent = `已生成两份 PDF（${dateStr}）`;
  } catch (err) {
    console.error(err);
    messageEl.textContent = "PDF 生成失败: " + err.message;
  } finally {
    // 退出 PDF 渲染模式，恢复正常显示
    document.body.classList.remove("pdf-mode");
    problemGroupsEl.classList.remove("pdf-mode");
    document.querySelectorAll(".ans").forEach((el) => {
      el.style.display = "";
    });
    document.querySelectorAll(".correct").forEach((el) => {
      el.style.display = "";
    });
    pdfBtn.disabled = false;
    pdfBtn.textContent = "生成 PDF";
    updatePaginationUI();
  }
}

/**
 * 智能分页：估算每组题目在 A4 页面上的占用高度(mm)，
 * 当累积高度超过可用区域时，在该组前插入 html2pdf 分页标记。
 *
 * 估算参数（基于 PDF 渲染的 4 列布局）：
 *   - A4 可用高度 ≈ 267mm（297mm - 上下边距各 15mm）
 *   - 每行题目高度 ≈ 7.5mm（13pt 字号 + 行间距）
 *   - 打印头部(姓名/日期/得分) ≈ 20mm
 *   - 组间距 ≈ 5mm
 */
function insertSmartPageBreaks() {
  const PAGE_H = 267;       // A4 可用高度 (mm)
  const ROW_H = 7.2;        // 每行题目高度 (mm)：13pt字号 + 0.36rem上下内边距
  const HEADER_H = 10;      // 打印头部高度 (mm)：11pt字号 + padding + margin
  const GAP_H = 3;           // 组间距 (mm)：0.5rem margin + 0.4rem margin-top
  const COLS = 4;            // PDF 列数

  // 先清除之前可能残留的分页标记
  problemGroupsEl.querySelectorAll(".html2pdf__page-break").forEach((el) => el.remove());

  const groups = problemGroupsEl.querySelectorAll(".problem-group");
  let accumulated = 0;

  groups.forEach((group, index) => {
    const problemCount = group.querySelectorAll(".problem").length;
    const rows = Math.ceil(problemCount / COLS);
    const groupHeight = HEADER_H + rows * ROW_H + (index > 0 ? GAP_H : 0);

    if (index > 0 && accumulated + groupHeight > PAGE_H) {
      // 当前页放不下这一组，在其前面插入分页
      const pageBreak = document.createElement("div");
      pageBreak.className = "html2pdf__page-break";
      group.parentNode.insertBefore(pageBreak, group);
      accumulated = HEADER_H + rows * ROW_H; // 新页从此组开始
    } else {
      accumulated += groupHeight;
    }
  });
}
