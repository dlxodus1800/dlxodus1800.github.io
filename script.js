/* =========================================================
   KEYDECK - script.js
   ---------------------------------------------------------
   [1] 데이터 (다음 주 데이터베이스로 옮길 부분)
   ========================================================= */

// 상품 분류 (→ category 테이블)
const CATEGORIES = [
  { code: "mech",      name: "기계식 키보드",     desc: "또각또각 손맛 그대로" },
  { code: "wireless",  name: "무선·저소음 키보드", desc: "도서관, 사무실에서도 조용히" },
  { code: "keycap",    name: "키캡",              desc: "내 키보드를 새롭게" },
  { code: "accessory", name: "액세서리",          desc: "손목 받침, 케이블" }
];

// 상품 (→ product 테이블)
const PRODUCTS = [
  { id: 1, name: "KD87 텐키리스 기계식 키보드 (적축)", category: "기계식 키보드", price: 89000, stock: 30,
    image: "img/product-1.svg", featured: true,
    desc: "숫자패드를 뺀 87키 배열이라 책상이 좁아도 마우스 공간이 넉넉해요. 가벼운 적축 스위치로 오래 타이핑해도 손이 덜 피로합니다.",
    specs: { "배열": "87키 텐키리스", "스위치": "리니어 적축", "연결": "USB-C 유선", "키캡": "PBT 이중사출" } },
  { id: 2, name: "KD108 풀배열 기계식 키보드 (갈축)", category: "기계식 키보드", price: 119000, stock: 20,
    image: "img/product-2.svg", featured: true,
    desc: "엑셀·회계 작업이 많은 직장인을 위한 숫자패드 포함 풀배열. 갈축 특유의 가벼운 걸림이 정확한 입력을 도와줘요.",
    specs: { "배열": "108키 풀배열", "스위치": "넌클릭 갈축", "연결": "USB-C 유선", "키캡": "PBT 이중사출" } },
  { id: 3, name: "KD68 무소음 무선 키보드", category: "무선·저소음 키보드", price: 69000, stock: 40,
    image: "img/product-3.svg", featured: true,
    desc: "무소음 스위치를 넣은 68키 컴팩트 키보드. 블루투스로 노트북·태블릿 3대까지 번갈아 연결할 수 있어 강의실과 도서관에 잘 맞아요.",
    specs: { "배열": "68키 컴팩트", "스위치": "저소음 리니어", "연결": "블루투스 5.1 / 2.4GHz", "배터리": "최대 3개월 (조명 끔)" } },
  { id: 4, name: "KD 슬림 블루투스 오피스 키보드", category: "무선·저소음 키보드", price: 49000, stock: 50,
    image: "img/product-4.svg", featured: false,
    desc: "두께 11mm 슬림 키보드. 가방에 쏙 들어가고 키 소리가 작아 회의 중에도 부담 없이 메모할 수 있어요.",
    specs: { "배열": "87키 슬림", "스위치": "팬터그래프", "연결": "블루투스 5.0", "무게": "390g" } },
  { id: 5, name: "모노크롬 PBT 키캡 세트 (139키)", category: "키캡", price: 39000, stock: 60,
    image: "img/product-5.svg", featured: true,
    desc: "검정·흰색 조합의 이중사출 PBT 키캡. 오래 써도 글자가 지워지지 않고 번들거림이 적어요. 텐키리스·풀배열 모두 호환됩니다.",
    specs: { "구성": "139키", "재질": "PBT 이중사출", "프로파일": "체리 프로파일", "호환": "MX 스위치 호환" } },
  { id: 6, name: "포인트 키캡 4종 세트", category: "키캡", price: 12000, stock: 80,
    image: "img/product-6.svg", featured: false,
    desc: "ESC · ENTER · ★ · K 키캡 4개 구성. 자주 누르는 키에 포인트를 주어 나만의 키보드를 만들어 보세요.",
    specs: { "구성": "4키 (ESC, ENTER, ★, K)", "재질": "PBT", "색상": "블랙 / 화이트", "호환": "MX 스위치 호환" } },
  { id: 7, name: "블랙 우드 손목 받침대", category: "액세서리", price: 25000, stock: 35,
    image: "img/product-7.svg", featured: false,
    desc: "원목에 블랙 오일 마감을 한 손목 받침대. 키보드 높이를 맞춰 장시간 과제·업무 중 손목 부담을 줄여 줍니다.",
    specs: { "크기": "360 × 80 × 18mm (텐키리스용)", "재질": "월넛 원목", "마감": "블랙 오일", "바닥": "미끄럼 방지 패드" } },
  { id: 8, name: "코일 케이블 USB-C (1.5m)", category: "액세서리", price: 19000, stock: 45,
    image: "img/product-8.svg", featured: false,
    desc: "꼬불꼬불한 코일 디자인으로 책상 위 선 정리가 깔끔해져요. 커넥터를 분리할 수 있는 항공 단자 방식입니다.",
    specs: { "길이": "1.5m (코일 포함)", "단자": "USB-C ↔ USB-A", "커넥터": "항공 단자 분리형", "색상": "블랙" } }
];

// 회원 등급 (→ grade 테이블) : 누적 구매 금액 기준
const GRADES = [
  { id: 1, name: "BASIC",  minAmount: 0,      rate: 0.01 },
  { id: 2, name: "SILVER", minAmount: 100000, rate: 0.03 },
  { id: 3, name: "GOLD",   minAmount: 300000, rate: 0.05 },
  { id: 4, name: "BLACK",  minAmount: 600000, rate: 0.07 }
];

// 운영 설정
const SIGNUP_POINT = 3000;        // 가입 축하 포인트
const FREE_SHIPPING_MIN = 50000;  // 무료배송 기준 금액
const SHIPPING_FEE = 3000;        // 기본 배송비
const SLIDE_INTERVAL = 6000;      // 슬라이드 교차 시간 (6초)

/* =========================================================
   [2] 저장소 (지금은 브라우저 localStorage, 다음 주엔 DB)
   ========================================================= */
const KEY = {
  members: "kd_members",   // 회원 목록
  session: "kd_session",   // 로그인한 회원 이메일
  cart: "kd_cart",         // 장바구니 [{ id, qty }]
  orders: "kd_orders",     // 주문 내역
  stock: "kd_stock"        // 주문으로 줄어든 재고 { 상품id: 남은재고 }
};

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 */ }
}

/* ---------- 공통 도우미 ---------- */
const $ = (sel) => document.querySelector(sel);
const won = (n) => n.toLocaleString("ko-KR") + "원";
const pt = (n) => n.toLocaleString("ko-KR") + "P";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function findProduct(id) { return PRODUCTS.find((p) => p.id === Number(id)); }
function findCategory(code) { return CATEGORIES.find((c) => c.code === code); }
function categoryCode(name) { const c = CATEGORIES.find((c) => c.name === name); return c ? c.code : ""; }

function getStock(id) {
  const map = load(KEY.stock, {});
  return map[id] !== undefined ? map[id] : findProduct(id).stock;
}

/* =========================================================
   [3] 회원 (회원가입 · 로그인 · 로그아웃 · 등급)
   ========================================================= */
function getMembers() { return load(KEY.members, []); }
function saveMembers(list) { save(KEY.members, list); }

function currentUser() {
  const email = load(KEY.session, null);
  if (!email) return null;
  return getMembers().find((m) => m.email === email) || null;
}
function updateUser(user) {
  const list = getMembers().map((m) => (m.email === user.email ? user : m));
  saveMembers(list);
}

function gradeOf(totalAmount) {
  let g = GRADES[0];
  GRADES.forEach((grade) => { if (totalAmount >= grade.minAmount) g = grade; });
  return g;
}
function nextGrade(grade) { return GRADES.find((g) => g.id === grade.id + 1) || null; }

function signup(e) {
  e.preventDefault();
  const name = $("#suName").value.trim();
  const email = $("#suEmail").value.trim().toLowerCase();
  const pw = $("#suPw").value;
  const pw2 = $("#suPw2").value;
  const phone = $("#suPhone").value.trim();
  const err = $("#signupError");

  if (!name || !email || !pw || !phone) return (err.textContent = "모든 항목을 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (err.textContent = "이메일 형식이 올바르지 않아요.");
  if (pw.length < 8) return (err.textContent = "비밀번호는 8자 이상이어야 해요.");
  if (pw !== pw2) return (err.textContent = "비밀번호 확인이 일치하지 않아요.");
  if (!/^[0-9-]{9,13}$/.test(phone)) return (err.textContent = "연락처는 숫자와 - 만 입력해 주세요.");
  if (!$("#suAgree").checked) return (err.textContent = "약관에 동의해 주세요.");

  const members = getMembers();
  if (members.some((m) => m.email === email)) return (err.textContent = "이미 가입된 이메일이에요.");

  // 회원 한 명 (→ member 테이블)
  const member = {
    id: members.length ? Math.max(...members.map((m) => m.id)) + 1 : 1,
    email, password: pw, name, phone,
    point: SIGNUP_POINT,
    totalAmount: 0,
    joinDate: new Date().toISOString().slice(0, 10)
  };
  members.push(member);
  saveMembers(members);
  save(KEY.session, email);

  err.textContent = "";
  e.target.reset();
  toast(`${name}님, 가입을 환영해요! ${pt(SIGNUP_POINT)}가 적립됐어요.`);
  updateHeader();
  goAfterLogin();
}

function login(e) {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const pw = $("#loginPw").value;
  const err = $("#loginError");
  if (!email || !pw) return (err.textContent = "이메일과 비밀번호를 입력해 주세요.");

  const member = getMembers().find((m) => m.email === email && m.password === pw);
  if (!member) return (err.textContent = "이메일 또는 비밀번호가 맞지 않아요.");

  save(KEY.session, email);
  err.textContent = "";
  e.target.reset();
  toast(`${member.name}님, 환영해요!`);
  updateHeader();
  goAfterLogin();
}

function logout() {
  localStorage.removeItem(KEY.session);
  updateHeader();
  toast("로그아웃 되었어요.");
  location.hash = "#home";
}

// 로그인이 필요한 화면에서 로그인 후 원래 화면으로 돌아가기
let returnHash = "";
function requireLogin(targetHash) {
  if (currentUser()) return true;
  returnHash = targetHash;
  toast("로그인이 필요해요.");
  location.hash = "#login";
  return false;
}
function goAfterLogin() {
  const target = returnHash || "#mypage";
  returnHash = "";
  location.hash = target;
}

/* =========================================================
   [4] 장바구니
   ========================================================= */
function getCart() { return load(KEY.cart, []); }
function saveCart(cart) { save(KEY.cart, cart); updateCartCount(); }

function addToCart(id, qty = 1) {
  const stock = getStock(id);
  const cart = getCart();
  const item = cart.find((c) => c.id === id);
  const now = item ? item.qty : 0;
  if (stock <= 0) return toast("품절된 상품이에요.");
  if (now + qty > stock) return toast(`재고가 ${stock}개 남아 있어요.`);
  if (item) item.qty += qty; else cart.push({ id, qty });
  saveCart(cart);
  toast("장바구니에 담았어요.");
}

function changeQty(id, qty) {
  const stock = getStock(id);
  qty = Math.max(1, Math.min(Number(qty) || 1, stock));
  const cart = getCart();
  const item = cart.find((c) => c.id === id);
  if (item) item.qty = qty;
  saveCart(cart);
  renderCart();
}

function removeFromCart(id) {
  saveCart(getCart().filter((c) => c.id !== id));
  toast("상품을 삭제했어요.");
  renderCart();
}

function cartLines() {
  return getCart()
    .map((c) => ({ ...c, product: findProduct(c.id) }))
    .filter((l) => l.product);
}
function calcTotals(usedPoint = 0) {
  const lines = cartLines();
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  const total = subtotal - usedPoint + shipping;
  return { lines, subtotal, shipping, usedPoint, total };
}

function updateCartCount() {
  $("#cartCount").textContent = getCart().reduce((s, c) => s + c.qty, 0);
}

/* =========================================================
   [5] 화면 그리기
   ========================================================= */
function productCard(p) {
  const stock = getStock(p.id);
  return `
    <article class="product-card">
      <a href="#detail/${p.id}" class="thumb">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
        ${stock <= 0 ? '<span class="soldout">SOLD OUT</span>' : ""}
      </a>
      <p class="cat">${p.category}</p>
      <h3 class="name"><a href="#detail/${p.id}">${escapeHtml(p.name)}</a></h3>
      <p class="price">${won(p.price)}</p>
      <button type="button" class="btn btn-line" data-add="${p.id}" ${stock <= 0 ? "disabled" : ""}>
        ${stock <= 0 ? "품절" : "장바구니 담기"}
      </button>
    </article>`;
}

/* ----- 홈 ----- */
function renderHome() {
  $("#categoryCards").innerHTML = CATEGORIES.map((c) => `
    <a href="#shop/${c.code}" class="category-card">
      <strong>${c.name}</strong><span>${c.desc}</span>
    </a>`).join("");

  $("#featuredGrid").innerHTML = PRODUCTS.filter((p) => p.featured).map(productCard).join("");

  $("#signupPointText").textContent = pt(SIGNUP_POINT);
  $("#gradeCards").innerHTML = GRADES.map((g) => `
    <div class="grade-card">
      <strong>${g.name}</strong>
      <span class="rate">${Math.round(g.rate * 100)}%</span>
      <p>${g.minAmount === 0 ? "가입 즉시" : "누적 " + won(g.minAmount) + " 이상"}</p>
    </div>`).join("");
}

/* ----- 상품 목록 · 검색 · 분류 필터 ----- */
const shopState = { cat: "all", q: "", sort: "new" };

function renderShop() {
  const cat = findCategory(shopState.cat);
  $("#filterButtons").innerHTML =
    [{ code: "all", name: "전체" }, ...CATEGORIES]
      .map((c) => `<button type="button" data-cat="${c.code}" class="${shopState.cat === c.code ? "active" : ""}">${c.name}</button>`)
      .join("");

  let list = PRODUCTS.filter((p) => {
    const okCat = shopState.cat === "all" || p.category === (cat && cat.name);
    const q = shopState.q.toLowerCase();
    const okQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    return okCat && okQ;
  });

  if (shopState.sort === "low") list.sort((a, b) => a.price - b.price);
  if (shopState.sort === "high") list.sort((a, b) => b.price - a.price);
  if (shopState.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  $("#sortSelect").value = shopState.sort;

  $("#shopTitle").textContent = shopState.q ? `'${shopState.q}' 검색 결과` : cat ? cat.name : "전체 상품";
  $("#resultInfo").textContent = `총 ${list.length}개 상품`;
  $("#shopGrid").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<p class="empty" style="grid-column:1/-1">찾는 상품이 없어요. 다른 검색어를 입력해 보세요.</p>`;
}

/* ----- 상품 상세 ----- */
function renderDetail(id) {
  const p = findProduct(id);
  const box = $("#detailBox");
  if (!p) {
    box.innerHTML = `<p class="empty" style="margin-top:40px">상품을 찾을 수 없어요. <a href="#shop"><u>상품 목록으로</u></a></p>`;
    return;
  }
  const stock = getStock(p.id);
  const user = currentUser();
  const grade = gradeOf(user ? user.totalAmount : 0);
  const earn = Math.floor(p.price * grade.rate);

  box.innerHTML = `
    <div class="detail">
      <div class="detail-img"><img src="${p.image}" alt="${escapeHtml(p.name)}"></div>
      <div class="detail-info">
        <p class="breadcrumb"><a href="#shop">전체</a> &gt; <a href="#shop/${categoryCode(p.category)}">${p.category}</a></p>
        <h2>${escapeHtml(p.name)}</h2>
        <p class="detail-price">${won(p.price)}</p>
        <p class="detail-desc">${p.desc}</p>
        <table class="spec-table">
          ${Object.entries(p.specs).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}
          <tr><th>재고</th><td>${stock > 0 ? stock + "개" : "품절"}</td></tr>
          <tr><th>배송</th><td>${won(FREE_SHIPPING_MIN)} 이상 무료배송 (미만 ${won(SHIPPING_FEE)})</td></tr>
        </table>
        <p class="point-info">${user ? `${user.name}님은 <b>${grade.name}</b> 등급 · 구매 시 <b>${pt(earn)}</b> (${Math.round(grade.rate * 100)}%) 적립`
                                     : `회원 구매 시 최대 ${Math.round(GRADES[GRADES.length - 1].rate * 100)}% 적립 · 가입하면 ${pt(SIGNUP_POINT)} 지급`}</p>
        <div class="buy-row">
          <div class="qty">
            <button type="button" data-step="-1" aria-label="수량 줄이기">−</button>
            <input type="number" id="detailQty" value="1" min="1" max="${Math.max(stock, 1)}" aria-label="수량">
            <button type="button" data-step="1" aria-label="수량 늘리기">+</button>
          </div>
          <button type="button" class="btn btn-line" id="detailAdd" ${stock <= 0 ? "disabled" : ""}>장바구니</button>
          <button type="button" class="btn" id="detailBuy" ${stock <= 0 ? "disabled" : ""}>바로 구매</button>
        </div>
      </div>
    </div>`;

  const qtyInput = $("#detailQty");
  box.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      const v = Number(qtyInput.value) + Number(b.dataset.step);
      qtyInput.value = Math.max(1, Math.min(v, Math.max(stock, 1)));
    }));
  qtyInput.addEventListener("change", () => {
    qtyInput.value = Math.max(1, Math.min(Number(qtyInput.value) || 1, Math.max(stock, 1)));
  });
  $("#detailAdd").addEventListener("click", () => addToCart(p.id, Number(qtyInput.value)));
  // 바로 구매: 장바구니에 이 상품이 없으면 선택한 수량만큼 담고 주문서로 이동
  $("#detailBuy").addEventListener("click", () => {
    const cart = getCart();
    if (!cart.some((c) => c.id === p.id)) {
      cart.push({ id: p.id, qty: Math.min(Number(qtyInput.value), stock) });
      saveCart(cart);
    }
    location.hash = "#checkout";
  });
}

/* ----- 장바구니 ----- */
function renderCart() {
  const { lines, subtotal, shipping, total } = calcTotals(0);
  const box = $("#cartBox");
  if (!lines.length) {
    box.innerHTML = `<div class="empty">장바구니가 비어 있어요.<br><br><a href="#shop" class="btn">쇼핑하러 가기</a></div>`;
    return;
  }
  const user = currentUser();
  const grade = gradeOf(user ? user.totalAmount : 0);

  box.innerHTML = `
    <div class="cart-layout">
      <ul class="cart-list">
        ${lines.map((l) => `
          <li class="cart-item">
            <img src="${l.product.image}" alt="${escapeHtml(l.product.name)}">
            <div class="ci-info">
              <p class="ci-name"><a href="#detail/${l.id}">${escapeHtml(l.product.name)}</a></p>
              <p class="ci-price">${won(l.product.price)}</p>
            </div>
            <div class="qty">
              <button type="button" data-cart-step="-1" data-id="${l.id}" aria-label="수량 줄이기">−</button>
              <input type="number" value="${l.qty}" min="1" max="${getStock(l.id)}" data-cart-qty="${l.id}" aria-label="수량">
              <button type="button" data-cart-step="1" data-id="${l.id}" aria-label="수량 늘리기">+</button>
            </div>
            <span class="ci-sum">${won(l.product.price * l.qty)}</span>
            <button type="button" class="del-btn" data-del="${l.id}">삭제</button>
          </li>`).join("")}
      </ul>
      <aside class="summary-box">
        <h3>결제 예정 금액</h3>
        <div class="sum-row"><span>상품 금액</span><span>${won(subtotal)}</span></div>
        <div class="sum-row"><span>배송비</span><span>${shipping ? won(shipping) : "무료"}</span></div>
        <div class="sum-row total"><span>합계</span><span id="cartTotal">${won(total)}</span></div>
        <div class="sum-row earn"><span>${user ? grade.name + " 적립 예정" : "적립 예정 (BASIC 기준)"}</span><span>${pt(Math.floor(subtotal * grade.rate))}</span></div>
        ${shipping ? `<p class="hint" style="margin-top:8px">${won(FREE_SHIPPING_MIN - subtotal)} 더 담으면 무료배송!</p>` : ""}
        <a href="#checkout" class="btn btn-full">주문하기</a>
      </aside>
    </div>`;

  box.querySelectorAll("[data-cart-step]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = Number(b.dataset.id);
      const item = getCart().find((c) => c.id === id);
      const next = item.qty + Number(b.dataset.cartStep);
      if (next > getStock(id)) return toast(`재고가 ${getStock(id)}개 남아 있어요.`);
      changeQty(id, next);
    }));
  box.querySelectorAll("[data-cart-qty]").forEach((inp) =>
    inp.addEventListener("change", () => changeQty(Number(inp.dataset.cartQty), inp.value)));
  box.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => removeFromCart(Number(b.dataset.del))));
}

/* ----- 주문서 (체험 결제) ----- */
function maxUsablePoint(user, subtotal) { return Math.max(0, Math.min(user.point, subtotal)); }

function renderCheckout() {
  const user = currentUser();
  const lines = cartLines();
  if (!lines.length) { toast("장바구니가 비어 있어요."); location.hash = "#cart"; return; }

  // 배송 정보 기본값
  if (!$("#coName").value) $("#coName").value = user.name;
  if (!$("#coPhone").value) $("#coPhone").value = user.phone;
  $("#coError").textContent = "";

  const pointInput = $("#coPoint");
  const subtotal = calcTotals(0).subtotal;
  const maxP = maxUsablePoint(user, subtotal);
  pointInput.max = maxP;
  if (Number(pointInput.value) > maxP) pointInput.value = maxP;
  $("#coPointHint").textContent = `보유 ${pt(user.point)} · 이번 주문에 최대 ${pt(maxP)}까지 사용 가능`;
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const user = currentUser();
  if (!user) return;
  const subtotal = calcTotals(0).subtotal;
  const used = Math.max(0, Math.min(Math.floor(Number($("#coPoint").value) || 0), maxUsablePoint(user, subtotal)));
  const t = calcTotals(used);
  const grade = gradeOf(user.totalAmount);
  const earn = Math.floor((t.subtotal - used) * grade.rate);

  $("#checkoutSummary").innerHTML = `
    <h3>주문 상품</h3>
    <ul class="mini-list">
      ${t.lines.map((l) => `<li><span>${escapeHtml(l.product.name)} × ${l.qty}</span><span>${won(l.product.price * l.qty)}</span></li>`).join("")}
    </ul>
    <div class="sum-row"><span>상품 금액</span><span>${won(t.subtotal)}</span></div>
    <div class="sum-row"><span>포인트 사용</span><span>-${pt(used)}</span></div>
    <div class="sum-row"><span>배송비</span><span>${t.shipping ? won(t.shipping) : "무료"}</span></div>
    <div class="sum-row total"><span>최종 결제</span><span>${won(t.total)}</span></div>
    <div class="sum-row earn"><span>${grade.name} 등급 ${Math.round(grade.rate * 100)}% 적립</span><span>+${pt(earn)}</span></div>`;
}

function placeOrder(e) {
  e.preventDefault();
  const user = currentUser();
  if (!user) return requireLogin("#checkout");
  const err = $("#coError");
  const receiver = $("#coName").value.trim();
  const phone = $("#coPhone").value.trim();
  const address = $("#coAddr").value.trim();
  if (!receiver || !phone || !address) return (err.textContent = "배송 정보를 모두 입력해 주세요.");
  if (!/^[0-9-]{9,13}$/.test(phone)) return (err.textContent = "연락처는 숫자와 - 만 입력해 주세요.");

  // 재고 다시 확인
  const lines = cartLines();
  if (!lines.length) return (err.textContent = "장바구니가 비어 있어요.");
  const lack = lines.find((l) => l.qty > getStock(l.id));
  if (lack) return (err.textContent = `${lack.product.name} 재고가 부족해요. (남은 재고 ${getStock(lack.id)}개)`);

  const subtotal = calcTotals(0).subtotal;
  const usedPoint = Math.max(0, Math.min(Math.floor(Number($("#coPoint").value) || 0), maxUsablePoint(user, subtotal)));
  const t = calcTotals(usedPoint);
  const grade = gradeOf(user.totalAmount);
  const buyAmount = t.subtotal - usedPoint;               // 적립·등급 기준 금액 (배송비 제외)
  const earnedPoint = Math.floor(buyAmount * grade.rate);

  // 주문 한 건 (→ orders + order_item 테이블)
  const orders = load(KEY.orders, []);
  const now = new Date();
  const order = {
    orderNo: "KD" + now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0")
             + "-" + String(orders.length + 1).padStart(4, "0"),
    memberEmail: user.email,
    orderDate: now.toLocaleString("ko-KR"),
    items: t.lines.map((l) => ({ productId: l.id, name: l.product.name, price: l.product.price, qty: l.qty })),
    subtotal: t.subtotal,
    usedPoint,
    shipping: t.shipping,
    total: t.total,
    gradeName: grade.name,
    earnedPoint,
    payMethod: document.querySelector('input[name="pay"]:checked').value,
    receiver, phone, address,
    memo: $("#coMemo").value.trim(),
    status: "주문완료(체험)"
  };
  orders.push(order);
  save(KEY.orders, orders);

  // 재고 차감
  const stockMap = load(KEY.stock, {});
  t.lines.forEach((l) => { stockMap[l.id] = getStock(l.id) - l.qty; });
  save(KEY.stock, stockMap);

  // 포인트 · 누적 금액 · 등급 반영
  user.point = user.point - usedPoint + earnedPoint;
  user.totalAmount += buyAmount;
  updateUser(user);
  const newGrade = gradeOf(user.totalAmount);

  saveCart([]);
  e.target.reset();
  $("#coPoint").value = 0;
  if (newGrade.id > grade.id) toast(`축하해요! ${newGrade.name} 등급이 되었어요.`);
  location.hash = "#done/" + order.orderNo;
}

/* ----- 주문 완료 ----- */
function renderDone(orderNo) {
  const order = load(KEY.orders, []).find((o) => o.orderNo === orderNo);
  const user = currentUser();
  const box = $("#doneBox");
  if (!order || !user || order.memberEmail !== user.email) {
    box.innerHTML = `<p class="empty" style="margin-top:40px">주문 정보를 찾을 수 없어요.</p>`;
    return;
  }
  box.innerHTML = `
    <div class="done-box">
      <div class="check-icon">✓</div>
      <h2>주문이 완료되었어요</h2>
      <p>체험 결제라 실제로 돈이 나가지 않았어요. 주문 내역은 마이페이지에서 볼 수 있어요.</p>
      <div class="done-detail">
        <div class="sum-row"><span>주문번호</span><b>${order.orderNo}</b></div>
        <div class="sum-row"><span>결제 수단</span><span>${order.payMethod}</span></div>
        <div class="sum-row"><span>결제 금액</span><b>${won(order.total)}</b></div>
        <div class="sum-row"><span>적립 포인트</span><span>+${pt(order.earnedPoint)} (${order.gradeName})</span></div>
        <div class="sum-row"><span>현재 보유 포인트</span><span>${pt(user.point)}</span></div>
      </div>
      <div class="done-actions">
        <a href="#mypage" class="btn">주문 내역 보기</a>
        <a href="#shop" class="btn btn-line">계속 쇼핑하기</a>
      </div>
    </div>`;
}

/* ----- 마이페이지 ----- */
function renderMypage() {
  const user = currentUser();
  const grade = gradeOf(user.totalAmount);
  const next = nextGrade(grade);
  const orders = load(KEY.orders, []).filter((o) => o.memberEmail === user.email).reverse();
  const progress = next ? Math.min(100, Math.round(((user.totalAmount - grade.minAmount) / (next.minAmount - grade.minAmount)) * 100)) : 100;

  $("#mypageBox").innerHTML = `
    <h2 class="page-title">마이페이지</h2>
    <div class="my-top">
      <div class="my-card dark">
        <p class="label">회원 등급</p>
        <p class="value">${grade.name}</p>
        <p class="sub">구매 금액의 ${Math.round(grade.rate * 100)}% 적립</p>
        <div class="progress"><span style="width:${progress}%"></span></div>
        <p class="sub" style="margin-top:6px">${next ? `${won(next.minAmount - user.totalAmount)} 더 구매하면 ${next.name}` : "최고 등급이에요"}</p>
      </div>
      <div class="my-card">
        <p class="label">보유 포인트</p>
        <p class="value">${pt(user.point)}</p>
        <p class="sub">주문할 때 현금처럼 사용</p>
      </div>
      <div class="my-card">
        <p class="label">누적 구매 금액</p>
        <p class="value">${won(user.totalAmount)}</p>
        <p class="sub">주문 ${orders.length}건</p>
      </div>
    </div>

    <section class="my-section">
      <h3>회원 정보</h3>
      <table class="info-table">
        <tr><th>이름</th><td>${escapeHtml(user.name)}</td></tr>
        <tr><th>이메일</th><td>${escapeHtml(user.email)}</td></tr>
        <tr><th>연락처</th><td>${escapeHtml(user.phone)}</td></tr>
        <tr><th>가입일</th><td>${user.joinDate}</td></tr>
      </table>
    </section>

    <section class="my-section">
      <h3>주문 내역</h3>
      ${orders.length ? orders.map((o) => `
        <div class="order-card">
          <div class="order-head"><strong>${o.orderNo}</strong><span>${o.orderDate} · ${o.status}</span></div>
          <ul class="order-items">
            ${o.items.map((i) => `<li><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${won(i.price * i.qty)}</span></li>`).join("")}
          </ul>
          <div class="order-foot">
            <span>포인트 -${pt(o.usedPoint)} · 배송비 ${o.shipping ? won(o.shipping) : "무료"} · 적립 +${pt(o.earnedPoint)}</span>
            <b>${won(o.total)}</b>
          </div>
        </div>`).join("")
      : `<p class="empty">아직 주문 내역이 없어요. <a href="#shop"><u>상품 보러 가기</u></a></p>`}
    </section>`;
}

/* ----- 헤더 상태 ----- */
function updateHeader() {
  const user = currentUser();
  $("#navLogin").hidden = !!user;
  $("#navSignup").hidden = !!user;
  $("#navMypage").hidden = !user;
  $("#logoutBtn").hidden = !user;
  if (user) $("#navMypage").textContent = `${user.name}님 · ${pt(user.point)}`;
  updateCartCount();
}

/* =========================================================
   [6] 화면 이동 (주소의 # 뒤를 보고 해당 section 만 보여줌)
   ========================================================= */
const PAGES = ["home", "shop", "detail", "cart", "checkout", "done", "login", "signup", "mypage"];

function showPage(name) {
  PAGES.forEach((p) => { $("#page-" + p).hidden = p !== name; });
  document.querySelectorAll("#navList a").forEach((a) => {
    const h = a.getAttribute("href");
    a.classList.toggle("active", name === "shop" && h === "#shop" + (shopState.cat === "all" ? "" : "/" + shopState.cat));
  });
  $(".site-header").classList.remove("open");
  $("#menuToggle").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}

function router() {
  const [page, param] = decodeURIComponent(location.hash.replace("#", "")).split("/");
  switch (page) {
    case "shop":
      shopState.cat = param && findCategory(param) ? param : "all";
      if (param !== "search") shopState.q = "";
      if (param === "search") shopState.cat = "all";
      showPage("shop"); renderShop(); break;
    case "detail":   showPage("detail"); renderDetail(param); break;
    case "cart":     showPage("cart"); renderCart(); break;
    case "checkout": if (requireLogin("#checkout")) { showPage("checkout"); renderCheckout(); } break;
    case "done":     showPage("done"); renderDone(param); break;
    case "login":    if (currentUser()) { location.hash = "#mypage"; break; } showPage("login"); break;
    case "signup":   if (currentUser()) { location.hash = "#mypage"; break; } showPage("signup"); break;
    case "mypage":   if (requireLogin("#mypage")) { showPage("mypage"); renderMypage(); } break;
    default:         showPage("home"); renderHome();
  }
}

/* =========================================================
   [7] 메인 슬라이드 (사진 4장, 6초마다 교차)
   ========================================================= */
function initSlider() {
  const slides = document.querySelectorAll("#slider .slide");
  const dotsBox = $("#sliderDots");
  let index = 0;
  let timer;

  dotsBox.innerHTML = [...slides].map((_, i) =>
    `<button type="button" aria-label="${i + 1}번 사진 보기" class="${i === 0 ? "active" : ""}"></button>`).join("");
  const dots = dotsBox.querySelectorAll("button");

  function go(i) {
    slides[index].classList.remove("active");
    dots[index].classList.remove("active");
    index = (i + slides.length) % slides.length;
    slides[index].classList.add("active");
    dots[index].classList.add("active");
  }
  function start() { clearInterval(timer); timer = setInterval(() => go(index + 1), SLIDE_INTERVAL); }

  dots.forEach((d, i) => d.addEventListener("click", () => { go(i); start(); }));
  start();
}

/* =========================================================
   [8] 시작
   ========================================================= */
function init() {
  // 분류 메뉴 만들기
  $("#navList").insertAdjacentHTML("beforeend",
    CATEGORIES.map((c) => `<li><a href="#shop/${c.code}">${c.name}</a></li>`).join(""));

  // 검색
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    shopState.q = $("#searchInput").value.trim();
    shopState.cat = "all";
    if (location.hash === "#shop/search") { showPage("shop"); renderShop(); }
    else location.hash = "#shop/search";
  });

  // 목록 필터 · 정렬
  $("#filterButtons").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cat]");
    if (!b) return;
    $("#searchInput").value = "";
    location.hash = b.dataset.cat === "all" ? "#shop" : "#shop/" + b.dataset.cat;
  });
  $("#sortSelect").addEventListener("change", (e) => { shopState.sort = e.target.value; renderShop(); });

  // 카드의 '장바구니 담기' 버튼 (홈 · 목록 공통)
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (b) { addToCart(Number(b.dataset.add), 1); }
  });

  // 회원
  $("#signupForm").addEventListener("submit", signup);
  $("#loginForm").addEventListener("submit", login);
  $("#logoutBtn").addEventListener("click", logout);

  // 주문서
  $("#coPoint").addEventListener("input", renderCheckoutSummary);
  $("#coPoint").addEventListener("change", renderCheckout);
  $("#usePointAll").addEventListener("click", () => {
    const user = currentUser();
    $("#coPoint").value = maxUsablePoint(user, calcTotals(0).subtotal);
    renderCheckoutSummary();
  });
  $("#checkoutForm").addEventListener("submit", placeOrder);

  // 모바일 메뉴
  $("#menuToggle").addEventListener("click", () => {
    const open = $(".site-header").classList.toggle("open");
    $("#menuToggle").setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("hashchange", router);
  updateHeader();
  initSlider();
  router();
}

document.addEventListener("DOMContentLoaded", init);
