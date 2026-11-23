/* =========================================================
   KEYDECK - script.js  (Supabase 연결판)
   ---------------------------------------------------------
   Supabase 주소 · 공개 키는 db.js 에 있습니다. (이 파일의 db 는 db.js 가 만든 것)
   [1] 설정 · 데이터   ← 여기만 고치면 됩니다
   ========================================================= */

// 상품 분류 (상품의 category 칸과 같은 글자여야 한다)
const CATEGORIES = [
  { code: "mech",      name: "기계식 키보드",     desc: "또각또각 손맛 그대로" },
  { code: "wireless",  name: "무선·저소음 키보드", desc: "도서관, 사무실에서도 조용히" },
  { code: "keycap",    name: "키캡",              desc: "내 키보드를 새롭게" },
  { code: "accessory", name: "액세서리",          desc: "손목 받침, 케이블" }
];

// 회원 등급 4단계 — 이름은 DB(shop_profiles.grade)의 CHECK 와 같아야 한다.
// 등급은 관리자가 정한다. 적립률은 「적립 예정」 숫자를 화면에 보여 줄 때만 쓴다.
const GRADES = [
  { id: 1, name: "WELCOME", minAmount: 0,      rate: 0.01 },
  { id: 2, name: "SILVER",  minAmount: 100000, rate: 0.03 },
  { id: 3, name: "GOLD",    minAmount: 300000, rate: 0.05 },
  { id: 4, name: "VIP",     minAmount: 600000, rate: 0.07 }
];

// 상품 · 회원 · 주문 데이터는 DB(shop_products 등)에 있다.
//   상품 한 개 → { id, name, category, price, stock, image_url, is_active }
const ORDER_STATUS = ["결제완료", "배송중", "배송완료", "취소"];   // shop_orders.status 의 CHECK 와 같다

// 운영 설정
const SIGNUP_POINT = 3000;        // 가입 축하 포인트 (DB 기본값과 같다)
const SLIDE_INTERVAL = 6000;      // 슬라이드 교차 시간 (6초)
const NO_IMAGE = "img/favicon.svg";

/* =========================================================
   [2] 도우미
   ========================================================= */
const $ = (sel) => document.querySelector(sel);
const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
const pt = (n) => Number(n || 0).toLocaleString("ko-KR") + "P";

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경 */ }
}
function removeKey(key) {
  try { localStorage.removeItem(key); } catch (e) { /* 저장 불가 환경 */ }
}

let toastTimer;
function toast(msg, ms = 2400) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

function findCategory(code) { return CATEGORIES.find((c) => c.code === code); }
function categoryCode(name) { const c = CATEGORIES.find((c) => c.name === name); return c ? c.code : ""; }
function gradeInfo(name) { return GRADES.find((g) => g.name === name) || GRADES[0]; }
function nextGrade(grade) { return GRADES.find((g) => g.id === grade.id + 1) || null; }

function orderNo(order) {
  const d = new Date(order.created_at);
  const ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return "KD" + ymd + "-" + String(order.id).padStart(4, "0");
}
function dateText(iso) { return iso ? new Date(iso).toLocaleString("ko-KR") : ""; }

/* =========================================================
   [3] 로그인 · 회원 정보  (db.js 의 db 사용)
   ========================================================= */
const CART_KEY = "kd_cart";         // 장바구니 [{ id, qty }] — 장바구니는 DB 에 두지 않는다

function configured() { return typeof SUPABASE_KEY === "string" && !SUPABASE_KEY.includes("붙여넣기"); }

const ERROR_TEXT = {
  invalid_credentials: "이메일 또는 비밀번호가 맞지 않아요.",
  email_not_confirmed: "메일 인증이 아직이에요. 받은 편지함의 확인 링크를 눌러 주세요.",
  user_already_exists: "이미 가입된 이메일이에요.",
  weak_password: "비밀번호가 너무 쉬워요. 더 길고 복잡하게 만들어 주세요.",
  email_address_invalid: "사용할 수 없는 이메일 주소예요.",
  over_email_send_rate_limit: "잠시 후에 다시 시도해 주세요. (메일 전송 횟수 제한)",
  over_request_rate_limit: "요청이 너무 많아요. 잠시 후에 다시 시도해 주세요.",
  signup_disabled: "지금은 회원가입을 받지 않아요."
};

// supabase-js 가 돌려주는 error 를 한글 안내문으로 바꾼다
function errText(error) {
  if (!error) return "";
  const code = error.code, status = error.status, m = String(error.message || "");
  if (/invalid api key/i.test(m)) return "Supabase 공개 키가 올바르지 않아요. db.js 의 키를 다시 복사해 넣어 주세요.";
  if (code && ERROR_TEXT[code]) return ERROR_TEXT[code];
  if (m === "Invalid login credentials") return ERROR_TEXT.invalid_credentials;
  if (m === "User already registered") return ERROR_TEXT.user_already_exists;
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(m)) return "서버에 연결할 수 없어요. 인터넷 연결과 db.js 의 주소를 확인해 주세요.";
  if (status === 429) return ERROR_TEXT.over_request_rate_limit;
  if (/jwt expired|invalid jwt/i.test(m) || code === "PGRST301" || code === "PGRST303" || status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (code === "42501" || status === 403) return "권한이 없어요.";
  return m || "알 수 없는 오류가 났어요.";
}

/* ----- 로그인 정보 ----- */
let session = null;   // 로그인 중이면 supabase-js 의 세션 { user, access_token, ... }, 아니면 null
let profile = null;   // shop_profiles 의 내 한 줄

async function loadProfile() {
  if (!session) { profile = null; return; }
  const { data, error } = await db.from("shop_profiles").select("*").eq("id", session.user.id).maybeSingle();
  if (error && (error.status === 401 || /jwt/i.test(error.message || ""))) {   // 로그인이 만료된 경우
    await db.auth.signOut();
    session = null;
  }
  profile = error ? null : data;
}

function currentUser() {
  if (!session) return null;
  return profile || { id: session.user.id, email: session.user.email, name: "", phone: "", grade: "WELCOME", points: 0, role: "member", created_at: null };
}
function isAdmin() { return !!profile && profile.role === "admin"; }

/* =========================================================
   [4] 상품 불러오기
   ========================================================= */
let PRODUCTS = [];          // 판매 중인 상품 (DB 에서 읽어 온 것)
let productsError = "";

function normalizeProduct(p) {
  let specs = p.specs;
  if (typeof specs === "string") { try { specs = JSON.parse(specs); } catch (e) { specs = {}; } }
  return { ...p, price: Number(p.price), stock: Number(p.stock), specs: specs && typeof specs === "object" ? specs : {} };
}

async function loadProducts() {
  const { data, error } = await db.from("shop_products").select("*").eq("is_active", true).order("id");
  if (error) { PRODUCTS = []; productsError = errText(error); return; }
  PRODUCTS = data.map(normalizeProduct);
  productsError = "";
}

function findProduct(id) { return PRODUCTS.find((p) => p.id === Number(id)); }
function imageOf(p) { return p.image_url || NO_IMAGE; }

/* =========================================================
   [5] 장바구니 (브라우저에 저장)
   ========================================================= */
function getCart() { return load(CART_KEY, []); }
function saveCart(cart) { save(CART_KEY, cart); updateCartCount(); }

function addToCart(id, qty = 1) {
  const p = findProduct(id);
  if (!p) return toast("판매하지 않는 상품이에요.");
  const cart = getCart();
  const item = cart.find((c) => c.id === id);
  const now = item ? item.qty : 0;
  if (p.stock <= 0) return toast("품절된 상품이에요.");
  if (now + qty > p.stock) return toast(`재고가 ${p.stock}개 남아 있어요.`);
  if (item) item.qty += qty; else cart.push({ id, qty });
  saveCart(cart);
  toast("장바구니에 담았어요.");
}

function changeQty(id, qty) {
  const p = findProduct(id);
  qty = Math.max(1, Math.min(Number(qty) || 1, p ? Math.max(p.stock, 1) : 1));
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

// 판매가 끝난 상품이 장바구니에 남아 있으면 치운다
function cleanCart() {
  const cart = getCart();
  const kept = cart.filter((c) => findProduct(c.id));
  if (kept.length !== cart.length) { saveCart(kept); toast("판매가 끝난 상품은 장바구니에서 뺐어요."); }
}

function cartLines() {
  return getCart().map((c) => ({ ...c, product: findProduct(c.id) })).filter((l) => l.product);
}
function calcTotals() {
  const lines = cartLines();
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  return { lines, subtotal, total: subtotal };
}
function updateCartCount() {
  $("#cartCount").textContent = getCart().reduce((s, c) => s + c.qty, 0);
}

/* =========================================================
   [6] 회원가입 · 로그인 화면 동작
   ========================================================= */
let returnHash = "";
function requireLogin(targetHash) {
  if (session) return true;
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
function setFormMessage(sel, msg, ok = false) {
  const el = $(sel);
  el.textContent = msg;
  el.classList.toggle("ok", ok);
}

async function signup(e) {
  e.preventDefault();
  const name = $("#suName").value.trim();
  const email = $("#suEmail").value.trim().toLowerCase();
  const pw = $("#suPw").value;
  const pw2 = $("#suPw2").value;
  const phone = $("#suPhone").value.trim();
  const msg = (m) => setFormMessage("#signupError", m);

  if (!name || !email || !pw || !phone) return msg("모든 항목을 입력해 주세요.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("이메일 형식이 올바르지 않아요.");
  if (pw.length < 6) return msg("비밀번호는 6자 이상이어야 해요.");
  if (pw !== pw2) return msg("비밀번호 확인이 일치하지 않아요.");
  if (!/^[0-9-]{9,13}$/.test(phone)) return msg("연락처는 숫자와 - 만 입력해 주세요.");
  if (!$("#suAgree").checked) return msg("약관에 동의해 주세요.");
  if (!configured()) return msg("Supabase 공개 키가 아직 설정되지 않았어요. (db.js 맨 위)");

  const btn = $("#signupForm button[type=submit]");
  btn.disabled = true;
  try {
    const { data, error } = await db.auth.signUp({ email, password: pw, options: { data: { name, phone } } });
    if (error) throw error;
    session = data.session;                     // 메일 확인이 켜져 있으면 null
    if (!session) {
      setFormMessage("#signupError", "가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.", true);
      return;
    }
    await loadProfile();
    msg("");
    e.target.reset();
    toast(`${name}님, 가입을 환영해요! ${pt(SIGNUP_POINT)}가 적립됐어요.`);
    updateHeader();
    goAfterLogin();
  } catch (err) {
    msg(errText(err));
  } finally {
    btn.disabled = false;
  }
}

async function login(e) {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const pw = $("#loginPw").value;
  const msg = (m) => setFormMessage("#loginError", m);
  if (!email || !pw) return msg("이메일과 비밀번호를 입력해 주세요.");
  if (!configured()) return msg("Supabase 공개 키가 아직 설정되지 않았어요. (db.js 맨 위)");

  const btn = $("#loginForm button[type=submit]");
  btn.disabled = true;
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password: pw });
    if (error) throw error;
    session = data.session;
    await loadProfile();
    msg("");
    e.target.reset();
    toast(`${profile && profile.name ? profile.name + "님, " : ""}환영해요!`);
    updateHeader();
    goAfterLogin();
  } catch (err) {
    msg(errText(err));
  } finally {
    btn.disabled = false;
  }
}

async function logout() {
  await db.auth.signOut();
  session = null;
  profile = null;
  updateHeader();
  toast("로그아웃 되었어요.");
  if (location.hash === "#home") router(); else location.hash = "#home";
}

/* =========================================================
   [7] 화면 그리기
   ========================================================= */
function loadingHtml(text = "불러오는 중…") { return `<p class="loading" style="grid-column:1/-1">${text}</p>`; }
function errorHtml(text) { return `<p class="empty" style="grid-column:1/-1">${escapeHtml(text)}</p>`; }

function productCard(p) {
  return `
    <article class="product-card">
      <a href="#detail/${p.id}" class="thumb">
        <img src="${escapeHtml(imageOf(p))}" alt="${escapeHtml(p.name)}" loading="lazy">
        ${p.stock <= 0 ? '<span class="soldout">SOLD OUT</span>' : ""}
      </a>
      <p class="cat">${escapeHtml(p.category)}</p>
      <h3 class="name"><a href="#detail/${p.id}">${escapeHtml(p.name)}</a></h3>
      <p class="price">${won(p.price)}</p>
      <button type="button" class="btn btn-line" data-add="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>
        ${p.stock <= 0 ? "품절" : "장바구니 담기"}
      </button>
    </article>`;
}

/* ----- 홈 ----- */
function renderHome() {
  $("#categoryCards").innerHTML = CATEGORIES.map((c) => `
    <a href="#shop/${c.code}" class="category-card">
      <strong>${c.name}</strong><span>${c.desc}</span>
    </a>`).join("");

  const featured = PRODUCTS.filter((p) => p.featured);
  const list = featured.length ? featured : PRODUCTS.slice(0, 4);
  $("#featuredGrid").innerHTML = productsError ? errorHtml("상품을 불러오지 못했어요. " + productsError)
    : list.length ? list.map(productCard).join("") : errorHtml("등록된 상품이 아직 없어요.");

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

  const list = PRODUCTS.filter((p) => {
    const okCat = shopState.cat === "all" || p.category === (cat && cat.name);
    const q = shopState.q.toLowerCase();
    const okQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    return okCat && okQ;
  });

  if (shopState.sort === "low") list.sort((a, b) => a.price - b.price);
  if (shopState.sort === "high") list.sort((a, b) => b.price - a.price);
  if (shopState.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  $("#sortSelect").value = shopState.sort;

  $("#shopTitle").textContent = shopState.q ? `'${shopState.q}' 검색 결과` : cat ? cat.name : "전체 상품";
  $("#resultInfo").textContent = productsError ? "" : `총 ${list.length}개 상품`;
  $("#shopGrid").innerHTML = productsError ? errorHtml("상품을 불러오지 못했어요. " + productsError)
    : list.length ? list.map(productCard).join("")
    : errorHtml("찾는 상품이 없어요. 다른 검색어를 입력해 보세요.");
}

/* ----- 상품 상세 ----- */
function renderDetail(id) {
  const p = findProduct(id);
  const box = $("#detailBox");
  if (!p) {
    box.innerHTML = `<p class="empty" style="margin-top:40px">${productsError ? "상품을 불러오지 못했어요. " + escapeHtml(productsError) : "상품을 찾을 수 없어요."} <a href="#shop"><u>상품 목록으로</u></a></p>`;
    return;
  }
  const user = currentUser();
  const grade = gradeInfo(user ? user.grade : "WELCOME");
  const earn = Math.floor(p.price * grade.rate);
  const specRows = Object.entries(p.specs).map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("");

  box.innerHTML = `
    <div class="detail">
      <div class="detail-img"><img src="${escapeHtml(imageOf(p))}" alt="${escapeHtml(p.name)}"></div>
      <div class="detail-info">
        <p class="breadcrumb"><a href="#shop">전체</a> &gt; <a href="#shop/${categoryCode(p.category)}">${escapeHtml(p.category)}</a></p>
        <h2>${escapeHtml(p.name)}</h2>
        <p class="detail-price">${won(p.price)}</p>
        <p class="detail-desc">${escapeHtml(p.description || "")}</p>
        <table class="spec-table">
          ${specRows}
          <tr><th>재고</th><td>${p.stock > 0 ? p.stock + "개" : "품절"}</td></tr>
        </table>
        <p class="point-info">${user ? `${escapeHtml(user.name || "회원")}님은 <b>${grade.name}</b> 등급 · 구매 시 <b>${pt(earn)}</b> (${Math.round(grade.rate * 100)}%) 적립`
                                     : `회원 구매 시 최대 ${Math.round(GRADES[GRADES.length - 1].rate * 100)}% 적립 · 가입하면 ${pt(SIGNUP_POINT)} 지급`}</p>
        <div class="buy-row">
          <div class="qty">
            <button type="button" data-step="-1" aria-label="수량 줄이기">−</button>
            <input type="number" id="detailQty" value="1" min="1" max="${Math.max(p.stock, 1)}" aria-label="수량">
            <button type="button" data-step="1" aria-label="수량 늘리기">+</button>
          </div>
          <button type="button" class="btn btn-line" id="detailAdd" ${p.stock <= 0 ? "disabled" : ""}>장바구니</button>
          <button type="button" class="btn" id="detailBuy" ${p.stock <= 0 ? "disabled" : ""}>바로 구매</button>
        </div>
      </div>
    </div>`;

  const qtyInput = $("#detailQty");
  const maxQty = Math.max(p.stock, 1);
  box.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      qtyInput.value = Math.max(1, Math.min(Number(qtyInput.value) + Number(b.dataset.step), maxQty));
    }));
  qtyInput.addEventListener("change", () => {
    qtyInput.value = Math.max(1, Math.min(Number(qtyInput.value) || 1, maxQty));
  });
  $("#detailAdd").addEventListener("click", () => addToCart(p.id, Number(qtyInput.value)));
  // 바로 구매: 장바구니에 이 상품이 없으면 선택한 수량만큼 담고 주문서로 이동
  $("#detailBuy").addEventListener("click", () => {
    const cart = getCart();
    if (!cart.some((c) => c.id === p.id)) {
      cart.push({ id: p.id, qty: Math.min(Number(qtyInput.value), p.stock) });
      saveCart(cart);
    }
    location.hash = "#checkout";
  });
}

/* ----- 장바구니 ----- */
function renderCart() {
  const { lines, subtotal, total } = calcTotals();
  const box = $("#cartBox");
  if (!lines.length) {
    box.innerHTML = `<div class="empty">${productsError ? "상품을 불러오지 못했어요. " + escapeHtml(productsError) : "장바구니가 비어 있어요."}<br><br><a href="#shop" class="btn">쇼핑하러 가기</a></div>`;
    return;
  }
  const user = currentUser();
  const grade = gradeInfo(user ? user.grade : "WELCOME");

  box.innerHTML = `
    <div class="cart-layout">
      <ul class="cart-list">
        ${lines.map((l) => `
          <li class="cart-item">
            <img src="${escapeHtml(imageOf(l.product))}" alt="${escapeHtml(l.product.name)}">
            <div class="ci-info">
              <p class="ci-name"><a href="#detail/${l.id}">${escapeHtml(l.product.name)}</a></p>
              <p class="ci-price">${won(l.product.price)}</p>
            </div>
            <div class="qty">
              <button type="button" data-cart-step="-1" data-id="${l.id}" aria-label="수량 줄이기">−</button>
              <input type="number" value="${l.qty}" min="1" max="${l.product.stock}" data-cart-qty="${l.id}" aria-label="수량">
              <button type="button" data-cart-step="1" data-id="${l.id}" aria-label="수량 늘리기">+</button>
            </div>
            <span class="ci-sum">${won(l.product.price * l.qty)}</span>
            <button type="button" class="del-btn" data-del="${l.id}">삭제</button>
          </li>`).join("")}
      </ul>
      <aside class="summary-box">
        <h3>결제 예정 금액</h3>
        <div class="sum-row"><span>상품 금액</span><span>${won(subtotal)}</span></div>
        <div class="sum-row total"><span>합계</span><span id="cartTotal">${won(total)}</span></div>
        <div class="sum-row earn"><span>${user ? grade.name + " 적립 예정" : "적립 예정 (WELCOME 기준)"}</span><span>${pt(Math.floor(subtotal * grade.rate))}</span></div>
        <a href="#checkout" class="btn btn-full">주문하기</a>
      </aside>
    </div>`;

  box.querySelectorAll("[data-cart-step]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = Number(b.dataset.id);
      const item = getCart().find((c) => c.id === id);
      const next = item.qty + Number(b.dataset.cartStep);
      const p = findProduct(id);
      if (next > p.stock) return toast(`재고가 ${p.stock}개 남아 있어요.`);
      changeQty(id, next);
    }));
  box.querySelectorAll("[data-cart-qty]").forEach((inp) =>
    inp.addEventListener("change", () => changeQty(Number(inp.dataset.cartQty), inp.value)));
  box.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => removeFromCart(Number(b.dataset.del))));
}

/* ----- 주문서 (체험 결제) ----- */
function renderCheckout() {
  if (!cartLines().length) { toast("장바구니가 비어 있어요."); location.hash = "#cart"; return; }
  $("#coError").textContent = "";
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const user = currentUser();
  if (!user) return;
  const t = calcTotals();
  const grade = gradeInfo(user.grade);
  $("#checkoutSummary").innerHTML = `
    <h3>주문 상품</h3>
    <ul class="mini-list">
      ${t.lines.map((l) => `<li><span>${escapeHtml(l.product.name)} × ${l.qty}</span><span>${won(l.product.price * l.qty)}</span></li>`).join("")}
    </ul>
    <div class="sum-row total"><span>최종 결제</span><span>${won(t.total)}</span></div>
    <div class="sum-row earn"><span>${grade.name} 등급 ${Math.round(grade.rate * 100)}% 적립 예정</span><span>+${pt(Math.floor(t.total * grade.rate))}</span></div>
    <p class="hint" style="margin-top:8px">적립 예정 포인트는 화면에만 보여 줘요. 실제 포인트는 관리자가 정해요.</p>`;
}

// 주문 한 건 = shop_orders 한 줄 + shop_order_items 여러 줄 (user_id · status 는 DB 가 채운다)
async function placeOrder(e) {
  e.preventDefault();
  if (!session) return requireLogin("#checkout");
  const err = $("#coError");
  const lines = cartLines();
  if (!lines.length) return (err.textContent = "장바구니가 비어 있어요.");
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  const btn = $("#checkoutForm button[type=submit]");
  btn.disabled = true;
  err.textContent = "";
  let step = "주문을 저장하지 못했어요. ";
  try {
    const { data: order, error: e1 } = await db.from("shop_orders").insert({ total }).select().single();
    if (e1) throw e1;
    step = "주문 상세를 저장하지 못했어요. ";
    const rows = lines.map((l) => ({ order_id: order.id, product_id: l.id, qty: l.qty, unit_price: l.product.price }));
    const { error: e2 } = await db.from("shop_order_items").insert(rows);
    if (e2) throw e2;
    saveCart([]);
    location.hash = "#done/" + order.id;
  } catch (ex) {
    if (/만료/.test(errText(ex))) { await loadProfile(); updateHeader(); if (!session) return requireLogin("#checkout"); }
    if (!stillOnCheckout()) return;
    err.textContent = step + errText(ex);
  } finally {
    btn.disabled = false;
  }
}
function stillOnCheckout() { return location.hash === "#checkout"; }

/* ----- 주문 내역 읽기 ----- */
async function fetchItemsByOrder(orders) {
  const map = {};
  if (!orders.length) return map;
  const { data, error } = await db.from("shop_order_items").select("*").in("order_id", orders.map((o) => o.id));
  if (error) throw error;
  data.forEach((i) => { (map[i.order_id] = map[i.order_id] || []).push(i); });
  return map;
}
function productName(id) { const p = findProduct(id); return p ? p.name : "상품 " + id; }

/* ----- 주문 완료 ----- */
async function renderDone(id) {
  const box = $("#doneBox");
  const user = currentUser();
  let order = null, items = [];
  try {
    const { data, error } = await db.from("shop_orders").select("*").eq("id", Number(id) || 0).eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    order = data;
    if (order) items = (await fetchItemsByOrder([order]))[order.id] || [];
  } catch (e) { /* 아래에서 안내 */ }
  if (!order) {
    box.innerHTML = `<p class="empty" style="margin-top:40px">주문 정보를 찾을 수 없어요.</p>`;
    return;
  }
  const grade = gradeInfo(user.grade);
  box.innerHTML = `
    <div class="done-box">
      <div class="check-icon">✓</div>
      <h2>주문이 완료되었어요</h2>
      <p>체험 결제라 실제로 돈이 나가지 않았어요. 주문 내역은 마이페이지에서 볼 수 있어요.</p>
      <div class="done-detail">
        <div class="sum-row"><span>주문번호</span><b>${orderNo(order)}</b></div>
        ${items.map((i) => `<div class="sum-row"><span>${escapeHtml(productName(i.product_id))} × ${i.qty}</span><span>${won(i.unit_price * i.qty)}</span></div>`).join("")}
        <div class="sum-row"><span>결제 금액</span><b>${won(order.total)}</b></div>
        <div class="sum-row"><span>적립 예정 포인트</span><span>+${pt(Math.floor(order.total * grade.rate))}</span></div>
      </div>
      <div class="done-actions">
        <a href="#mypage" class="btn">주문 내역 보기</a>
        <a href="#shop" class="btn btn-line">계속 쇼핑하기</a>
      </div>
    </div>`;
}

/* ----- 마이페이지 ----- */
async function renderMypage() {
  const box = $("#mypageBox");
  const user = currentUser();
  let orders = [], itemsMap = {}, loadError = "";
  try {
    const { data, error } = await db.from("shop_orders").select("*").eq("user_id", user.id).order("id", { ascending: false });
    if (error) throw error;
    orders = data;
    itemsMap = await fetchItemsByOrder(orders);
  } catch (e) { loadError = errText(e); }

  const grade = gradeInfo(user.grade);
  const spent = orders.filter((o) => o.status !== "취소").reduce((s, o) => s + o.total, 0);

  box.innerHTML = `
    <h2 class="page-title">마이페이지</h2>
    <div class="my-top">
      <div class="my-card dark">
        <p class="label">회원 등급</p>
        <p class="value">${grade.name}</p>
        <p class="sub">구매 금액의 ${Math.round(grade.rate * 100)}% 적립 예정</p>
      </div>
      <div class="my-card">
        <p class="label">보유 포인트</p>
        <p class="value">${pt(user.points)}</p>
        <p class="sub">가입하면 ${pt(SIGNUP_POINT)}가 들어와요</p>
      </div>
      <div class="my-card">
        <p class="label">누적 구매 금액</p>
        <p class="value">${won(spent)}</p>
        <p class="sub">주문 ${orders.length}건</p>
      </div>
    </div>

    <section class="my-section">
      <h3>회원 정보</h3>
      <form id="profileForm" class="form-box profile-form" novalidate>
        <label>이름<input type="text" id="pfName" value="${escapeHtml(user.name)}"></label>
        <label>연락처<input type="tel" id="pfPhone" value="${escapeHtml(user.phone)}" placeholder="010-0000-0000"></label>
        <table class="info-table">
          <tr><th>이메일</th><td>${escapeHtml(user.email)}</td></tr>
          <tr><th>가입일</th><td>${user.created_at ? new Date(user.created_at).toLocaleDateString("ko-KR") : ""}</td></tr>
        </table>
        <p class="form-error" id="pfMsg"></p>
        <button type="submit" class="btn btn-line">정보 저장</button>
      </form>
    </section>

    <section class="my-section">
      <h3>주문 내역</h3>
      ${loadError ? `<p class="empty">주문 내역을 불러오지 못했어요. ${escapeHtml(loadError)}</p>`
        : orders.length ? orders.map((o) => `
        <div class="order-card">
          <div class="order-head"><strong>${orderNo(o)}</strong><span>${dateText(o.created_at)} · ${escapeHtml(o.status)}</span></div>
          <ul class="order-items">
            ${(itemsMap[o.id] || []).map((i) => `<li><span>${escapeHtml(productName(i.product_id))} × ${i.qty}</span><span>${won(i.unit_price * i.qty)}</span></li>`).join("")}
          </ul>
          <div class="order-foot">
            <span>적립 예정 +${pt(Math.floor(o.total * grade.rate))}</span>
            <b>${won(o.total)}</b>
          </div>
        </div>`).join("")
        : `<p class="empty">아직 주문 내역이 없어요. <a href="#shop"><u>상품 보러 가기</u></a></p>`}
    </section>`;

  $("#profileForm").addEventListener("submit", saveProfile);
}

async function saveProfile(e) {
  e.preventDefault();
  const name = $("#pfName").value.trim();
  const phone = $("#pfPhone").value.trim();
  const msg = $("#pfMsg");
  if (!name) return (msg.textContent = "이름을 입력해 주세요.");
  if (!/^[0-9-]{9,13}$/.test(phone)) return (msg.textContent = "연락처는 숫자와 - 만 입력해 주세요.");
  const { error } = await db.from("shop_profiles").update({ name, phone }).eq("id", session.user.id);
  if (error) { msg.textContent = errText(error); return; }
  await loadProfile();
  updateHeader();
  msg.textContent = "";
  toast("회원 정보를 저장했어요.");
}

/* ----- 헤더 상태 ----- */
function updateHeader() {
  const user = currentUser();
  $("#navLogin").hidden = !!user;
  $("#navSignup").hidden = !!user;
  $("#navMypage").hidden = !user;
  $("#navAdmin").hidden = !isAdmin();   // 관리자에게만 「관리」 링크가 보인다
  $("#logoutBtn").hidden = !user;
  if (user) $("#navMypage").textContent = `${user.name ? user.name + "님 · " : ""}${pt(user.points)}`;
  updateCartCount();
}

/* =========================================================
   [9] 화면 이동 (주소의 # 뒤를 보고 해당 section 만 보여줌)
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

let navId = 0;   // 화면이 빨리 바뀌었을 때, 늦게 도착한 응답이 화면을 덮지 않게 한다
async function router() {
  const myNav = ++navId;
  const stale = () => myNav !== navId;
  const [page, param] = decodeURIComponent(location.hash.replace("#", "")).split("/");

  switch (page) {
    case "shop":
      shopState.cat = param && findCategory(param) ? param : "all";
      if (param !== "search") shopState.q = "";
      if (param === "search") shopState.cat = "all";
      showPage("shop");
      $("#shopGrid").innerHTML = loadingHtml();
      await loadProducts(); if (stale()) return;
      renderShop(); break;
    case "detail":
      showPage("detail");
      $("#detailBox").innerHTML = loadingHtml();
      await loadProducts(); if (stale()) return;
      renderDetail(param); break;
    case "cart":
      showPage("cart");
      $("#cartBox").innerHTML = loadingHtml();
      await loadProducts(); if (stale()) return;
      cleanCart(); renderCart(); break;
    case "checkout":
      if (!requireLogin("#checkout")) return;
      showPage("checkout");
      await Promise.all([loadProducts(), loadProfile()]); if (stale()) return;
      if (!session) { updateHeader(); requireLogin("#checkout"); return; }
      cleanCart(); renderCheckout(); break;
    case "done":
      if (!requireLogin(location.hash)) return;
      showPage("done");
      $("#doneBox").innerHTML = loadingHtml();
      await Promise.all([profile ? null : loadProfile(), loadProducts()]);
      if (stale()) return;
      if (!session) { requireLogin(location.hash); return; }
      await renderDone(param); break;
    case "login":
      if (session) { location.hash = "#mypage"; return; }
      showPage("login"); break;
    case "signup":
      if (session) { location.hash = "#mypage"; return; }
      showPage("signup"); break;
    case "mypage":
      if (!requireLogin("#mypage")) return;
      showPage("mypage");
      $("#mypageBox").innerHTML = loadingHtml();
      await Promise.all([loadProfile(), loadProducts()]); if (stale()) return;
      updateHeader();
      if (!session) { requireLogin("#mypage"); return; }
      await renderMypage(); break;
    default:
      showPage("home");
      $("#featuredGrid").innerHTML = loadingHtml();
      renderHome();
      await loadProducts(); if (stale()) return;
      renderHome();
  }
}

/* =========================================================
   [10] 메인 슬라이드 (사진 4장, 6초마다 교차)
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
   [11] 시작
   ========================================================= */
async function init() {
  // 분류 메뉴 만들기
  $("#navList").insertAdjacentHTML("beforeend",
    CATEGORIES.map((c) => `<li><a href="#shop/${c.code}">${c.name}</a></li>`).join(""));
  $("#configBanner").hidden = configured();

  // 검색
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    shopState.q = $("#searchInput").value.trim();
    shopState.cat = "all";
    if (location.hash === "#shop/search") router(); else location.hash = "#shop/search";
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
    if (b) addToCart(Number(b.dataset.add), 1);
  });

  // 회원
  $("#signupForm").addEventListener("submit", signup);
  $("#loginForm").addEventListener("submit", login);
  $("#logoutBtn").addEventListener("click", logout);

  // 주문서
  $("#checkoutForm").addEventListener("submit", placeOrder);

  // 모바일 메뉴
  $("#menuToggle").addEventListener("click", () => {
    const open = $(".site-header").classList.toggle("open");
    $("#menuToggle").setAttribute("aria-expanded", String(open));
  });

  window.addEventListener("hashchange", router);
  initSlider();
  updateCartCount();
  const { data: sess } = await db.auth.getSession();   // 이전에 로그인했다면 세션이 남아 있다
  session = sess.session;
  db.auth.onAuthStateChange((event, s) => { session = s; if (!s) profile = null; });
  if (session) { await loadProfile(); }
  updateHeader();
  router();
  checkConnection();
}

// 연결이 되는지 콘솔(F12)에 한 줄로 알려 준다
async function checkConnection() {
  const { count, error } = await db.from("shop_products").select("*", { count: "exact", head: true });
  console.log(error ? "연결 실패: " + error.message : "연결 성공: 상품 " + count + "개");
}

document.addEventListener("DOMContentLoaded", init);
