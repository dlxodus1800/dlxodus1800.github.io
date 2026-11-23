/* =========================================================
   KEYDECK - script.js  (Supabase 연결판)
   ---------------------------------------------------------
   [1] 설정 · 데이터   ← 여기만 고치면 됩니다
   ========================================================= */

// ★ Supabase 프로젝트 연결 정보 (Supabase 화면 맨 위 초록 「Connect」 버튼에서 복사)
//   · SUPABASE_URL : Project URL
//   · SUPABASE_KEY : 공개 키 (sb_publishable_ 로 시작하는 긴 글자)
//   ※ 공개 키는 GitHub 에 올려도 됩니다. 하지만 sb_secret_ / service_role 키와
//     Database Password 는 절대 여기에 넣지 마세요.
const SUPABASE_URL = "https://ivizlfsubsmvuzamhplv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-96KziC9lCt6XPWOT2uU9g_7vM1-8-L";

// 상품 분류 (상품의 category 칸과 같은 글자여야 한다)
const CATEGORIES = [
  { code: "mech",      name: "기계식 키보드",     desc: "또각또각 손맛 그대로" },
  { code: "wireless",  name: "무선·저소음 키보드", desc: "도서관, 사무실에서도 조용히" },
  { code: "keycap",    name: "키캡",              desc: "내 키보드를 새롭게" },
  { code: "accessory", name: "액세서리",          desc: "손목 받침, 케이블" }
];

// 회원 등급 4단계 — 이름은 DB(shop_profiles.grade)의 CHECK 와 같아야 한다.
// 적립률 · 누적 금액 기준은 keydeck_setup.sql 의 shop_place_order 함수와 같은 값이다.
const GRADES = [
  { id: 1, name: "WELCOME", minAmount: 0,      rate: 0.01 },
  { id: 2, name: "SILVER",  minAmount: 100000, rate: 0.03 },
  { id: 3, name: "GOLD",    minAmount: 300000, rate: 0.05 },
  { id: 4, name: "VIP",     minAmount: 600000, rate: 0.07 }
];

// 상품 · 회원 · 주문 데이터는 이제 DB(shop_products 등)에 있다.
// 아래는 DB 에 넣을 때 쓰는 값의 뜻이다.
//   상품 한 개 → { id, name, category, price, stock, image_url, is_active, featured, description, specs }
const ORDER_STATUS = ["결제완료", "배송중", "배송완료", "취소"];   // shop_orders.status 의 CHECK 와 같다

// 운영 설정
const SIGNUP_POINT = 3000;        // 가입 축하 포인트 (DB 기본값과 같다)
const FREE_SHIPPING_MIN = 50000;  // 무료배송 기준 금액
const SHIPPING_FEE = 3000;        // 기본 배송비
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
   [3] Supabase 와 통신 (외부 라이브러리 없이 fetch 만 사용)
   ========================================================= */
const SESSION_KEY = "kd_session";   // 로그인 정보 (브라우저에 저장)
const CART_KEY = "kd_cart";         // 장바구니 [{ id, qty }] — 장바구니는 DB 에 두지 않는다

class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}

function configured() { return !!SUPABASE_KEY && !SUPABASE_KEY.includes("붙여넣기"); }

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

function makeError(status, data) {
  const code = data && (data.error_code || data.code);
  let msg = data && (data.message || data.msg || data.error_description || data.error);
  if (typeof data === "string") msg = data;
  if (code && ERROR_TEXT[code]) msg = ERROR_TEXT[code];
  else if (msg === "Invalid login credentials") msg = ERROR_TEXT.invalid_credentials;
  else if (msg === "User already registered") msg = ERROR_TEXT.user_already_exists;
  else if (status === 429) msg = ERROR_TEXT.over_request_rate_limit;
  else if (code === "42501" || status === 403) msg = "권한이 없어요.";
  else if (status === 401 || code === "PGRST301" || code === "PGRST303") msg = "로그인이 만료됐어요. 다시 로그인해 주세요.";
  return new ApiError(msg || "알 수 없는 오류가 났어요. (" + status + ")", status, code);
}

async function rawFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  const h = { apikey: SUPABASE_KEY, ...headers };
  if (body !== undefined) h["Content-Type"] = "application/json";
  if (token) h.Authorization = "Bearer " + token;       // 로그인한 회원만 보낸다
  let res;
  try {
    res = await fetch(SUPABASE_URL + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new ApiError("서버에 연결할 수 없어요. 인터넷 연결과 SUPABASE_URL 을 확인해 주세요.", 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) throw makeError(res.status, data);
  return data;
}

/* ----- 로그인 정보(세션) ----- */
let session = load(SESSION_KEY, null);   // { access_token, refresh_token, expires_at, user: { id, email } }
let profile = null;                      // shop_profiles 의 내 한 줄

function setSession(d) {
  session = {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    user: { id: d.user.id, email: d.user.email }
  };
  save(SESSION_KEY, session);
}
function clearSession() { session = null; profile = null; removeKey(SESSION_KEY); }

let refreshing = null;
function refreshSession() {
  if (!refreshing) {
    refreshing = rawFetch("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: session.refresh_token } })
      .then(setSession)
      .catch(clearSession)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}
async function getToken() {
  if (!session) return null;
  if (session.expires_at - Date.now() / 1000 < 60) await refreshSession();   // 만료 1분 전에 새로 받는다
  return session ? session.access_token : null;
}

// 표 읽기 · 쓰기 (PostgREST)  예) rest("shop_products?select=*&order=id.asc")
async function rest(path, opts = {}) {
  const token = await getToken();
  return rawFetch("/rest/v1/" + path, { ...opts, token });
}
// 함수 부르기  예) rpc("shop_place_order", { ... })
function rpc(name, args) { return rest("rpc/" + name, { method: "POST", body: args }); }

/* ----- 회원가입 · 로그인 · 로그아웃 ----- */
async function authSignup(email, password, name, phone) {
  const d = await rawFetch("/auth/v1/signup", { method: "POST", body: { email, password, data: { name, phone } } });
  if (d && d.access_token) { setSession(d); return true; }   // 바로 로그인됨
  return false;                                              // 메일 인증이 필요한 설정
}
async function authLogin(email, password) {
  const d = await rawFetch("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  setSession(d);
}
async function authLogout() {
  const token = session && session.access_token;
  clearSession();
  if (token) { try { await rawFetch("/auth/v1/logout", { method: "POST", token }); } catch (e) { /* 이미 로그아웃된 것과 같다 */ } }
}

async function loadProfile() {
  if (!session) { profile = null; return; }
  try {
    const rows = await rest("shop_profiles?select=*&id=eq." + session.user.id);
    profile = rows[0] || null;
  } catch (e) {
    if (e.status === 401) clearSession();   // 로그인이 만료된 경우
    profile = null;
  }
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
  try {
    const rows = await rest("shop_products?select=*&order=id.asc");
    PRODUCTS = rows.map(normalizeProduct).filter((p) => p.is_active);   // 관리자 계정에도 판매 중인 상품만 보여 준다
    productsError = "";
  } catch (e) {
    PRODUCTS = [];
    productsError = e.message;
  }
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
function calcTotals(usedPoint = 0) {
  const lines = cartLines();
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  return { lines, subtotal, shipping, usedPoint, total: subtotal - usedPoint + shipping };
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
  if (pw.length < 8) return msg("비밀번호는 8자 이상이어야 해요.");
  if (pw !== pw2) return msg("비밀번호 확인이 일치하지 않아요.");
  if (!/^[0-9-]{9,13}$/.test(phone)) return msg("연락처는 숫자와 - 만 입력해 주세요.");
  if (!$("#suAgree").checked) return msg("약관에 동의해 주세요.");
  if (!configured()) return msg("Supabase 공개 키가 아직 설정되지 않았어요. (script.js 맨 위)");

  const btn = $("#signupForm button[type=submit]");
  btn.disabled = true;
  try {
    const loggedIn = await authSignup(email, pw, name, phone);
    if (!loggedIn) {
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
    msg(err.message);
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
  if (!configured()) return msg("Supabase 공개 키가 아직 설정되지 않았어요. (script.js 맨 위)");

  const btn = $("#loginForm button[type=submit]");
  btn.disabled = true;
  try {
    await authLogin(email, pw);
    await loadProfile();
    msg("");
    e.target.reset();
    toast(`${profile && profile.name ? profile.name + "님, " : ""}환영해요!`);
    updateHeader();
    goAfterLogin();
  } catch (err) {
    msg(err.message);
  } finally {
    btn.disabled = false;
  }
}

async function logout() {
  await authLogout();
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
          <tr><th>배송</th><td>${won(FREE_SHIPPING_MIN)} 이상 무료배송 (미만 ${won(SHIPPING_FEE)})</td></tr>
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
  const { lines, subtotal, shipping, total } = calcTotals(0);
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
        <div class="sum-row"><span>배송비</span><span>${shipping ? won(shipping) : "무료"}</span></div>
        <div class="sum-row total"><span>합계</span><span id="cartTotal">${won(total)}</span></div>
        <div class="sum-row earn"><span>${user ? grade.name + " 적립 예정" : "적립 예정 (WELCOME 기준)"}</span><span>${pt(Math.floor(subtotal * grade.rate))}</span></div>
        ${shipping ? `<p class="hint" style="margin-top:8px">${won(FREE_SHIPPING_MIN - subtotal)} 더 담으면 무료배송!</p>` : ""}
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
function maxUsablePoint(user, subtotal) { return Math.max(0, Math.min(user.points, subtotal)); }

function renderCheckout() {
  const user = currentUser();
  if (!cartLines().length) { toast("장바구니가 비어 있어요."); location.hash = "#cart"; return; }

  if (!$("#coName").value) $("#coName").value = user.name || "";
  if (!$("#coPhone").value) $("#coPhone").value = user.phone || "";
  $("#coError").textContent = "";

  const pointInput = $("#coPoint");
  const subtotal = calcTotals(0).subtotal;
  const maxP = maxUsablePoint(user, subtotal);
  pointInput.max = maxP;
  if (Number(pointInput.value) > maxP) pointInput.value = maxP;
  $("#coPointHint").textContent = `보유 ${pt(user.points)} · 이번 주문에 최대 ${pt(maxP)}까지 사용 가능`;
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const user = currentUser();
  if (!user) return;
  const subtotal = calcTotals(0).subtotal;
  const used = Math.max(0, Math.min(Math.floor(Number($("#coPoint").value) || 0), maxUsablePoint(user, subtotal)));
  const t = calcTotals(used);
  const grade = gradeInfo(user.grade);
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

// 주문은 DB 의 shop_place_order 함수가 한 번에 처리한다 (재고 · 포인트 · 등급 · 주문 저장)
async function placeOrder(e) {
  e.preventDefault();
  const user = currentUser();
  if (!user) return requireLogin("#checkout");
  const err = $("#coError");
  const receiver = $("#coName").value.trim();
  const phone = $("#coPhone").value.trim();
  const address = $("#coAddr").value.trim();
  if (!receiver || !phone || !address) return (err.textContent = "배송 정보를 모두 입력해 주세요.");
  if (!/^[0-9-]{9,13}$/.test(phone)) return (err.textContent = "연락처는 숫자와 - 만 입력해 주세요.");

  const lines = cartLines();
  if (!lines.length) return (err.textContent = "장바구니가 비어 있어요.");
  const subtotal = calcTotals(0).subtotal;
  const usedPoint = Math.max(0, Math.min(Math.floor(Number($("#coPoint").value) || 0), maxUsablePoint(user, subtotal)));

  const btn = $("#checkoutForm button[type=submit]");
  btn.disabled = true;
  err.textContent = "";
  try {
    const result = await rpc("shop_place_order", {
      p_items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
      p_used_points: usedPoint,
      p_pay_method: document.querySelector('input[name="pay"]:checked').value,
      p_receiver: receiver,
      p_phone: phone,
      p_address: address,
      p_memo: $("#coMemo").value.trim()
    });
    const before = gradeInfo(user.grade);
    saveCart([]);
    $("#checkoutForm").reset();
    $("#coPoint").value = 0;
    await loadProfile();
    updateHeader();
    if (gradeInfo(result.grade).id > before.id) toast(`축하해요! ${result.grade} 등급이 되었어요.`);
    location.hash = "#done/" + result.order_id;
  } catch (ex) {
    await loadProducts();       // 재고가 바뀌었을 수 있으니 다시 읽는다
    await loadProfile();
    if (!session) { updateHeader(); requireLogin("#checkout"); return; }   // 로그인이 만료된 경우
    if (!stillOnCheckout()) return;
    renderCheckout();
    err.textContent = ex.message;
  } finally {
    btn.disabled = false;
  }
}
function stillOnCheckout() { return location.hash === "#checkout"; }

/* ----- 주문 내역 읽기 ----- */
async function fetchItemsByOrder(orders) {
  const map = {};
  if (!orders.length) return map;
  const ids = orders.map((o) => o.id).join(",");
  const items = await rest(`shop_order_items?select=*&order_id=in.(${ids})`);
  items.forEach((i) => { (map[i.order_id] = map[i.order_id] || []).push(i); });
  return map;
}

/* ----- 주문 완료 ----- */
async function renderDone(id) {
  const box = $("#doneBox");
  const user = currentUser();
  let order = null;
  try {
    const rows = await rest(`shop_orders?select=*&id=eq.${Number(id) || 0}&user_id=eq.${user.id}`);
    order = rows[0];
  } catch (e) { /* 아래에서 안내 */ }
  if (!order) {
    box.innerHTML = `<p class="empty" style="margin-top:40px">주문 정보를 찾을 수 없어요.</p>`;
    return;
  }
  box.innerHTML = `
    <div class="done-box">
      <div class="check-icon">✓</div>
      <h2>주문이 완료되었어요</h2>
      <p>체험 결제라 실제로 돈이 나가지 않았어요. 주문 내역은 마이페이지에서 볼 수 있어요.</p>
      <div class="done-detail">
        <div class="sum-row"><span>주문번호</span><b>${orderNo(order)}</b></div>
        <div class="sum-row"><span>결제 수단</span><span>${escapeHtml(order.pay_method)}</span></div>
        <div class="sum-row"><span>결제 금액</span><b>${won(order.total)}</b></div>
        <div class="sum-row"><span>적립 포인트</span><span>+${pt(order.earned_points)}</span></div>
        <div class="sum-row"><span>현재 보유 포인트</span><span>${pt(user.points)}</span></div>
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
    orders = await rest(`shop_orders?select=*&user_id=eq.${user.id}&order=id.desc`);
    itemsMap = await fetchItemsByOrder(orders);
  } catch (e) { loadError = e.message; }

  const grade = gradeInfo(user.grade);
  const next = nextGrade(grade);
  const spent = orders.filter((o) => o.status !== "취소").reduce((s, o) => s + (o.subtotal - o.used_points), 0);
  const progress = next ? Math.max(0, Math.min(100, Math.round(((spent - grade.minAmount) / (next.minAmount - grade.minAmount)) * 100))) : 100;

  box.innerHTML = `
    <h2 class="page-title">마이페이지</h2>
    <div class="my-top">
      <div class="my-card dark">
        <p class="label">회원 등급</p>
        <p class="value">${grade.name}</p>
        <p class="sub">구매 금액의 ${Math.round(grade.rate * 100)}% 적립</p>
        <div class="progress"><span style="width:${progress}%"></span></div>
        <p class="sub" style="margin-top:6px">${next ? `${won(Math.max(0, next.minAmount - spent))} 더 구매하면 ${next.name}` : "최고 등급이에요"}</p>
      </div>
      <div class="my-card">
        <p class="label">보유 포인트</p>
        <p class="value">${pt(user.points)}</p>
        <p class="sub">주문할 때 현금처럼 사용</p>
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
            ${(itemsMap[o.id] || []).map((i) => `<li><span>${escapeHtml(i.product_name || "상품 " + i.product_id)} × ${i.qty}</span><span>${won(i.unit_price * i.qty)}</span></li>`).join("")}
          </ul>
          <div class="order-foot">
            <span>포인트 -${pt(o.used_points)} · 배송비 ${o.shipping ? won(o.shipping) : "무료"} · 적립 +${pt(o.earned_points)}</span>
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
  try {
    await rest("shop_profiles?id=eq." + session.user.id, { method: "PATCH", body: { name, phone }, headers: { Prefer: "return=minimal" } });
    await loadProfile();
    updateHeader();
    msg.textContent = "";
    toast("회원 정보를 저장했어요.");
  } catch (ex) {
    msg.textContent = ex.message;
  }
}

/* =========================================================
   [8] 관리자 페이지 (회원 관리 · 상품 관리 · 주문 관리)
       ※ 관리자인지 확인하는 진짜 문은 DB 의 보안 규칙(RLS)이다. 화면은 안내일 뿐이다.
   ========================================================= */
const SCROLL_HINT = '<p class="scroll-hint">표를 옆으로 밀면 더 보여요 →</p>';
const ADMIN_TABS = [
  { key: "members", name: "회원 관리" },
  { key: "products", name: "상품 관리" },
  { key: "orders", name: "주문 관리" }
];

async function renderAdmin(tab) {
  if (!ADMIN_TABS.some((t) => t.key === tab)) tab = "members";
  $("#adminTabs").innerHTML = ADMIN_TABS.map((t) =>
    `<a href="#admin/${t.key}" class="tab ${t.key === tab ? "active" : ""}">${t.name}</a>`).join("");
  const box = $("#adminBox");
  box.innerHTML = loadingHtml();
  try {
    if (tab === "members") await renderAdminMembers(box);
    if (tab === "products") await renderAdminProducts(box);
    if (tab === "orders") await renderAdminOrders(box);
  } catch (e) {
    box.innerHTML = `<p class="empty">${escapeHtml(e.message)}</p>`;
  }
}

/* ----- 회원 관리 ----- */
async function renderAdminMembers(box) {
  const members = await rest("shop_profiles?select=*&order=created_at.asc");
  box.innerHTML = `
    <div class="admin-top">
      <input type="search" id="memberFilter" placeholder="이름 · 이메일 검색" aria-label="회원 검색">
      <span class="result-info" id="memberCount">회원 ${members.length}명</span>
    </div>
    ${SCROLL_HINT}<div class="table-wrap">
      <table class="admin-table" id="memberTable">
        <thead><tr><th>이름</th><th>이메일</th><th>연락처</th><th>가입일</th><th>등급</th><th>포인트</th><th>역할</th><th></th></tr></thead>
        <tbody>
          ${members.map((m) => `
            <tr data-id="${m.id}" data-search="${escapeHtml((m.name + " " + m.email).toLowerCase())}">
              <td>${escapeHtml(m.name)}</td>
              <td>${escapeHtml(m.email)}</td>
              <td>${escapeHtml(m.phone)}</td>
              <td>${new Date(m.created_at).toLocaleDateString("ko-KR")}</td>
              <td><select data-f="grade">${GRADES.map((g) => `<option ${g.name === m.grade ? "selected" : ""}>${g.name}</option>`).join("")}</select></td>
              <td><input type="number" data-f="points" min="0" step="100" value="${m.points}"></td>
              <td>${m.id === session.user.id
                ? `<span title="본인 계정의 역할은 바꿀 수 없어요">${m.role}</span><input type="hidden" data-f="role" value="${m.role}">`
                : `<select data-f="role"><option ${m.role === "member" ? "selected" : ""}>member</option><option ${m.role === "admin" ? "selected" : ""}>admin</option></select>`}</td>
              <td><button type="button" class="btn btn-sm" data-save-member="${m.id}">저장</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  $("#memberFilter").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    let n = 0;
    box.querySelectorAll("#memberTable tbody tr").forEach((tr) => {
      const show = !q || tr.dataset.search.includes(q);
      tr.hidden = !show;
      if (show) n++;
    });
    $("#memberCount").textContent = `회원 ${n}명`;
  });
  box.querySelectorAll("[data-save-member]").forEach((b) =>
    b.addEventListener("click", async () => {
      const tr = b.closest("tr");
      const points = Math.floor(Number(tr.querySelector('[data-f="points"]').value));
      if (!(points >= 0)) return toast("포인트는 0 이상으로 입력해 주세요.");
      b.disabled = true;
      try {
        await rpc("shop_admin_update_member", {
          p_user_id: tr.dataset.id,
          p_grade: tr.querySelector('[data-f="grade"]').value,
          p_points: points,
          p_role: tr.querySelector('[data-f="role"]').value
        });
        toast("회원 정보를 저장했어요.");
        if (tr.dataset.id === session.user.id) { await loadProfile(); updateHeader(); }
      } catch (ex) { toast(ex.message); }
      finally { b.disabled = false; }
    }));
}

/* ----- 상품 관리 ----- */
async function renderAdminProducts(box) {
  const rows = (await rest("shop_products?select=*&order=id.asc")).map(normalizeProduct);
  const catOptions = (sel) => CATEGORIES.map((c) => `<option ${c.name === sel ? "selected" : ""}>${c.name}</option>`).join("");
  box.innerHTML = `
    ${SCROLL_HINT}<div class="table-wrap">
      <table class="admin-table">
        <thead><tr><th>그림</th><th>상품 이름</th><th>분류</th><th>가격</th><th>재고</th><th>판매</th><th>추천</th><th></th></tr></thead>
        <tbody>
          ${rows.map((p) => `
            <tr data-id="${p.id}">
              <td><img class="admin-thumb" src="${escapeHtml(imageOf(p))}" alt=""></td>
              <td><input type="text" data-f="name" value="${escapeHtml(p.name)}"></td>
              <td><select data-f="category">${catOptions(p.category)}</select></td>
              <td><input type="number" data-f="price" min="0" step="100" value="${p.price}"></td>
              <td><input type="number" data-f="stock" min="0" value="${p.stock}"></td>
              <td><input type="checkbox" data-f="is_active" ${p.is_active ? "checked" : ""} aria-label="판매 중"></td>
              <td><input type="checkbox" data-f="featured" ${p.featured ? "checked" : ""} aria-label="추천 상품"></td>
              <td><button type="button" class="btn btn-sm" data-save-product="${p.id}">저장</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="hint">판매를 끄면 방문자에게 보이지 않아요. (주문 기록이 있는 상품은 지우지 않고 끄는 방식으로 관리해요.)</p>

    <h3 class="admin-sub">새 상품 추가</h3>
    <form id="newProductForm" class="form-box add-form" novalidate>
      <label>상품 이름<input type="text" id="npName"></label>
      <label>분류<select id="npCategory">${catOptions("")}</select></label>
      <label>가격<input type="number" id="npPrice" min="0" step="100" value="10000"></label>
      <label>재고<input type="number" id="npStock" min="0" value="10"></label>
      <label>그림 파일 경로<input type="text" id="npImage" placeholder="img/product-1.svg"></label>
      <label class="wide">설명<input type="text" id="npDesc"></label>
      <p class="form-error wide" id="npMsg"></p>
      <button type="submit" class="btn wide">상품 추가</button>
    </form>`;

  box.querySelectorAll("[data-save-product]").forEach((b) =>
    b.addEventListener("click", async () => {
      const tr = b.closest("tr");
      const f = (k) => tr.querySelector(`[data-f="${k}"]`);
      const body = {
        name: f("name").value.trim(), category: f("category").value,
        price: Math.floor(Number(f("price").value)), stock: Math.floor(Number(f("stock").value)),
        is_active: f("is_active").checked, featured: f("featured").checked
      };
      if (!body.name) return toast("상품 이름을 입력해 주세요.");
      if (!(body.price >= 0) || !(body.stock >= 0)) return toast("가격과 재고는 0 이상으로 입력해 주세요.");
      b.disabled = true;
      try {
        await rest("shop_products?id=eq." + tr.dataset.id, { method: "PATCH", body, headers: { Prefer: "return=minimal" } });
        toast("상품을 저장했어요.");
      } catch (ex) { toast(ex.message); }
      finally { b.disabled = false; }
    }));

  $("#newProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#npMsg");
    const body = {
      name: $("#npName").value.trim(), category: $("#npCategory").value,
      price: Math.floor(Number($("#npPrice").value)), stock: Math.floor(Number($("#npStock").value)),
      image_url: $("#npImage").value.trim() || null, description: $("#npDesc").value.trim() || null
    };
    if (!body.name) return (msg.textContent = "상품 이름을 입력해 주세요.");
    if (!(body.price >= 0) || !(body.stock >= 0)) return (msg.textContent = "가격과 재고는 0 이상으로 입력해 주세요.");
    try {
      await rest("shop_products", { method: "POST", body, headers: { Prefer: "return=minimal" } });
      toast("상품을 추가했어요.");
      renderAdmin("products");
    } catch (ex) { msg.textContent = ex.message; }
  });
}

/* ----- 주문 관리 ----- */
async function renderAdminOrders(box) {
  const orders = await rest("shop_orders?select=*&order=id.desc&limit=200");
  const itemsMap = await fetchItemsByOrder(orders);
  const members = await rest("shop_profiles?select=id,name,email");
  const who = {};
  members.forEach((m) => { who[m.id] = m; });

  box.innerHTML = orders.length ? `
    ${SCROLL_HINT}<div class="table-wrap">
      <table class="admin-table">
        <thead><tr><th>주문번호</th><th>일시</th><th>회원</th><th>상품</th><th>결제 금액</th><th>상태</th><th></th></tr></thead>
        <tbody>
          ${orders.map((o) => {
            const m = who[o.user_id];
            return `
            <tr data-id="${o.id}">
              <td>${orderNo(o)}</td>
              <td>${dateText(o.created_at)}</td>
              <td>${m ? escapeHtml(m.name) + "<br><small>" + escapeHtml(m.email) + "</small>" : ""}</td>
              <td>${(itemsMap[o.id] || []).map((i) => escapeHtml(i.product_name || "상품 " + i.product_id) + " × " + i.qty).join("<br>")}</td>
              <td>${won(o.total)}</td>
              <td><select data-f="status">${ORDER_STATUS.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
              <td><button type="button" class="btn btn-sm" data-save-order="${o.id}">저장</button></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>` : `<p class="empty">아직 주문이 없어요.</p>`;

  box.querySelectorAll("[data-save-order]").forEach((b) =>
    b.addEventListener("click", async () => {
      const tr = b.closest("tr");
      b.disabled = true;
      try {
        await rest("shop_orders?id=eq." + tr.dataset.id, { method: "PATCH", body: { status: tr.querySelector('[data-f="status"]').value }, headers: { Prefer: "return=minimal" } });
        toast("주문 상태를 저장했어요.");
      } catch (ex) { toast(ex.message); }
      finally { b.disabled = false; }
    }));
}

/* ----- 헤더 상태 ----- */
function updateHeader() {
  const user = currentUser();
  $("#navLogin").hidden = !!user;
  $("#navSignup").hidden = !!user;
  $("#navMypage").hidden = !user;
  $("#navAdmin").hidden = !isAdmin();
  $("#logoutBtn").hidden = !user;
  if (user) $("#navMypage").textContent = `${user.name ? user.name + "님 · " : ""}${pt(user.points)}`;
  updateCartCount();
}

/* =========================================================
   [9] 화면 이동 (주소의 # 뒤를 보고 해당 section 만 보여줌)
   ========================================================= */
const PAGES = ["home", "shop", "detail", "cart", "checkout", "done", "login", "signup", "mypage", "admin"];

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
      if (!profile) await loadProfile();
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
      await loadProfile(); if (stale()) return;
      updateHeader();
      if (!session) { requireLogin("#mypage"); return; }
      await renderMypage(); break;
    case "admin":
      if (!requireLogin(location.hash)) return;
      showPage("admin");
      $("#adminBox").innerHTML = loadingHtml();
      await loadProfile(); if (stale()) return;
      updateHeader();
      if (!session) { requireLogin("#admin"); return; }
      if (!isAdmin()) { toast("관리자만 들어갈 수 있어요."); location.hash = "#home"; return; }
      await renderAdmin(param); break;
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
  initSlider();
  updateCartCount();
  if (session) { await loadProfile(); }   // 이전에 로그인했다면 내 정보부터 읽는다
  updateHeader();
  router();
}

document.addEventListener("DOMContentLoaded", init);
