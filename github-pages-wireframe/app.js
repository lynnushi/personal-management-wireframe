const screens = {
  today: document.querySelector("#screen-today"),
  body: document.querySelector("#screen-body"),
  study: document.querySelector("#screen-study"),
  hobby: document.querySelector("#screen-hobby"),
};

const screenTitle = document.querySelector("#screenTitle");
const navButtons = document.querySelectorAll("[data-nav]");
const overlay = document.querySelector("#overlay");
const drawer = document.querySelector("#drawer");
const drawerContent = document.querySelector("#drawerContent");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalContent = document.querySelector("#modalContent");
const toggleEmpty = document.querySelector("#toggleEmpty");

let currentScreen = "today";
let emptyMode = false;
let activePhotoMarked = false;

function showScreen(name) {
  currentScreen = name;
  Object.entries(screens).forEach(([key, screen]) => {
    screen.classList.toggle("active", key === name);
  });
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === name);
  });
  screenTitle.textContent = screens[name].dataset.title;
  applyEmptyMode();
}

function applyEmptyMode() {
  Object.values(screens).forEach((screen) => {
    screen.classList.toggle("is-empty", emptyMode);
  });
  toggleEmpty.textContent = emptyMode ? "有数据" : "空状态";
}

function openOverlay() {
  overlay.hidden = false;
}

function closeAll() {
  overlay.hidden = true;
  drawer.hidden = true;
  modal.hidden = true;
}

function openDrawer(kind) {
  openOverlay();
  drawer.hidden = false;

  if (kind === "body") {
    drawerContent.innerHTML = `
      <h3>选择身体记录类型</h3>
      <div class="drawer-actions">
        <button class="wide-button" data-form="身体测量">身体测量</button>
        <button class="wide-button" data-form="运动记录">运动记录</button>
        <button class="wide-button" data-form="月经记录">月经开始/结束</button>
        <button class="wide-button" data-form="身体状态">身体状态</button>
      </div>
    `;
    return;
  }

  if (kind === "backfill") {
    drawerContent.innerHTML = `
      <h3>补记过去日期</h3>
      <div class="form-grid">
        <div class="field">
          <label>记录日期</label>
          <input type="date" value="2026-06-24">
        </div>
        <div class="field">
          <label>记录类型</label>
          <select>
            <option>身体测量</option>
            <option>运动记录</option>
            <option>月经记录</option>
            <option>学习记录</option>
            <option>兴趣进展</option>
          </select>
        </div>
        <button class="primary-button" data-form="补记记录">继续填写</button>
      </div>
    `;
    return;
  }

  if (kind === "status") {
    drawerContent.innerHTML = `
      <h3>状态筛选</h3>
      <div class="drawer-actions">
        <button class="wide-button">进行中</button>
        <button class="wide-button">暂停</button>
        <button class="wide-button">已完成</button>
        <button class="wide-button">已归档</button>
      </div>
      <p class="hint">本轮只验证入口位置，暂不展开归档列表。</p>
    `;
  }
}

function formFields(title) {
  if (title.includes("学习项目")) {
    return `
      <div class="field"><label>项目名称</label><input value="日语"></div>
      <div class="field"><label>主统计单位</label><select><option>分钟</option><option>页</option><option>篇</option></select></div>
      <div class="field"><label>目标 / 说明（选填）</label><textarea rows="3">持续阅读教材，保持每周记录。</textarea></div>
    `;
  }

  if (title.includes("学习记录")) {
    return `
      <div class="field"><label>学习项目</label><select><option>日语</option><option>外刊</option><option>阅读</option></select></div>
      <div class="field"><label>日期</label><input type="date" value="2026-06-26"></div>
      <div class="field"><label>学习时长</label><input value="45 分钟"></div>
      <div class="field"><label>内容 / 进度（至少填一项）</label><textarea rows="3">教材第 36-37 页，下次从第 38 页继续。</textarea></div>
    `;
  }

  if (title.includes("兴趣项目")) {
    return `
      <div class="field"><label>分类</label><select><option>手工</option><option>游戏</option><option>书影音</option></select></div>
      <div class="field"><label>项目名称</label><input value="第一次制作衬衫"></div>
      <div class="field"><label>当前总体进度（选填）</label><textarea rows="3">完成裁布，正在处理袖口。</textarea></div>
    `;
  }

  if (title.includes("兴趣进展")) {
    return `
      <div class="field"><label>兴趣项目</label><select><option>第一次制作衬衫</option><option>艾尔登法环</option></select></div>
      <div class="field"><label>日期</label><input type="date" value="2026-06-26"></div>
      <div class="field"><label>照片</label><input value="已选择 3 张照片（模拟）"></div>
      <div class="field"><label>今天完成了什么</label><textarea rows="3">袖口试缝，两边长度不一致。下一步拆一边重缝。</textarea></div>
    `;
  }

  if (title.includes("运动")) {
    return `
      <div class="field"><label>日期</label><input type="date" value="2026-06-26"></div>
      <div class="field"><label>运动类型</label><input value="跑步"></div>
      <div class="field"><label>时长 / 距离（选填）</label><input value="32 分钟 / 4.1 km"></div>
      <div class="field"><label>感受（选填）</label><textarea rows="2">中等强度，结束后有点疲劳。</textarea></div>
    `;
  }

  if (title.includes("月经")) {
    return `
      <div class="field"><label>日期</label><input type="date" value="2026-06-26"></div>
      <div class="field"><label>事件</label><select><option>开始</option><option>结束</option></select></div>
      <div class="field"><label>症状 / 备注（选填）</label><textarea rows="2">轻微腹痛。</textarea></div>
    `;
  }

  if (title.includes("状态")) {
    return `
      <div class="field"><label>日期</label><input type="date" value="2026-06-26"></div>
      <div class="field"><label>状态标签</label><input value="疲劳、睡眠不足"></div>
      <div class="field"><label>备注（选填）</label><textarea rows="2">昨晚睡得比较晚。</textarea></div>
    `;
  }

  return `
    <div class="field"><label>日期</label><input type="date" value="2026-06-26"></div>
    <div class="field"><label>体重 / 体脂率 / 骨骼肌量（至少一项）</label><input value="57.8 kg"></div>
    <div class="field"><label>测量条件（选填）</label><input value="晨起空腹，家用体脂秤"></div>
    <div class="field"><label>备注（选填）</label><textarea rows="2">今天略有浮肿。</textarea></div>
  `;
}

function openForm(title) {
  drawer.hidden = true;
  openOverlay();
  modal.hidden = false;
  modalTitle.textContent = `${title} · 模拟表单`;
  modalContent.innerHTML = `
    <div class="form-grid">
      ${formFields(title)}
      <button class="primary-button" data-save>保存模拟记录</button>
      <p class="hint">这是低保真占位表单，不会连接数据库或保存真实数据。</p>
    </div>
  `;
}

function openDetail(title) {
  openOverlay();
  modal.hidden = false;
  modalTitle.textContent = `${title} · 通用记录详情`;
  modalContent.innerHTML = `
    <p>这里将展示单条记录的完整字段、创建时间和更新时间。</p>
    <div class="notice-list">
      <p>本轮只验证从主页面进入详情的入口是否清楚。</p>
      <p>后续可在详情中编辑、删除，删除会进入设置与数据管理页的回收站。</p>
    </div>
    <button class="primary-button" data-form="${title}">编辑模拟记录</button>
  `;
}

function openJump(title) {
  openOverlay();
  modal.hidden = false;
  modalTitle.textContent = title;
  modalContent.innerHTML = `
    <p>这里将进入「${title}」。本轮四个主页面原型只保留入口，不展开完整二级页面。</p>
    <button class="primary-button" data-close>知道了</button>
  `;
}

function openSettings() {
  openOverlay();
  modal.hidden = false;
  modalTitle.textContent = "设置与数据管理 · 占位";
  modalContent.innerHTML = `
    <p>设置、归档和回收站不在本轮四主页面原型范围内。</p>
    <div class="notice-list">
      <p>会从今日页进入。</p>
      <p>下一轮可继续设计基础设置、归档学习项目和回收站。</p>
    </div>
  `;
}

function openPhoto(name) {
  openOverlay();
  modal.hidden = false;
  modalTitle.textContent = name;
  activePhotoMarked = name.includes("待打印");
  modalContent.innerHTML = `
    <div class="photo" style="width:100%;max-height:260px;"></div>
    <p class="hint">照片为灰阶占位，不读取本地相册，也不上传。</p>
    <button class="primary-button" id="markPrint">${activePhotoMarked ? "取消待打印" : "标记待打印"}</button>
  `;
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) showScreen(nav.dataset.nav);

  const drawerButton = event.target.closest("[data-drawer]");
  if (drawerButton) openDrawer(drawerButton.dataset.drawer);

  const formButton = event.target.closest("[data-form]");
  if (formButton) openForm(formButton.dataset.form);

  const detailButton = event.target.closest("[data-detail]");
  if (detailButton) openDetail(detailButton.dataset.detail);

  const jumpButton = event.target.closest("[data-jump]");
  if (jumpButton) openJump(jumpButton.dataset.jump);

  const photoButton = event.target.closest("[data-photo]");
  if (photoButton) openPhoto(photoButton.dataset.photo);

  if (event.target.closest("[data-action='settings']")) openSettings();

  if (event.target.closest("[data-close]")) closeAll();

  if (event.target === overlay) closeAll();

  if (event.target.closest("[data-save]")) {
    modalTitle.textContent = "已保存模拟记录";
    modalContent.innerHTML = `
      <p>模拟保存成功。真实产品中会返回发起页面，并刷新对应统计或列表。</p>
      <button class="primary-button" data-close>返回</button>
    `;
  }

  const rangeButton = event.target.closest(".segmented button");
  if (rangeButton) {
    rangeButton.parentElement.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
    rangeButton.classList.add("active");
  }

  const metricButton = event.target.closest("[data-metric]");
  if (metricButton) {
    metricButton.parentElement.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
    metricButton.classList.add("active");
    document.querySelector("#bodyChart span").textContent = `${metricButton.dataset.metric}趋势占位图`;
  }

  const categoryChip = event.target.closest("#categoryChips .chip");
  if (categoryChip) {
    document.querySelectorAll("#categoryChips .chip").forEach((chip) => chip.classList.remove("active"));
    categoryChip.classList.add("active");
  }

  if (event.target.closest("[data-scroll-print]")) {
    document.querySelector("#printSection").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const markPrint = event.target.closest("#markPrint");
  if (markPrint) {
    activePhotoMarked = !activePhotoMarked;
    markPrint.textContent = activePhotoMarked ? "取消待打印" : "标记待打印";
  }
});

toggleEmpty.addEventListener("click", () => {
  emptyMode = !emptyMode;
  applyEmptyMode();
});

showScreen("today");
