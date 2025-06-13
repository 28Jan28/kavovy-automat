// Konfigurace Supabase
const SUPABASE_URL = 'https://djnregaxwlwumvuzomkz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbnJlZ2F4d2x3dW12dXpvbWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MTIyNTEsImV4cCI6MjA2NTI4ODI1MX0.kFleif1FUuRlfKe7NLpvDTG3TwzRExVWYu28WPHaRw8';

console.log("Inicializace aplikace - verze 2.0");

// Inicializace Supabase klienta - zkontrolujeme, že máme přístup k supabase
let supabaseClient;
try {
  const { createClient } = supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("Supabase klient byl vytvořen");
} catch (error) {
  console.error("Chyba při vytváření Supabase klienta:", error);
  alert("Chyba: Nepodařilo se inicializovat Supabase. Zkontrolujte připojení k internetu a obnovte stránku.");
}

// Globální proměnné pro přístup k DOM elementům
let loginSection, registerSection, appSection;
let currentUser = null;

// Konstanta pro lepší čitelnost typů
const USER_ROLE = {
  ADMIN: 'admin',
  USER: 'user'
};

// Funkce pro zobrazení chybové hlášky
function showError(message) {
  alert(`Chyba: ${message}`);
  console.error(message);
}

// Funkce pro formátování data a času
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Funkce pro formátování částky v Kč
function formatCurrency(amount) {
  return `${amount.toFixed(2)} Kč`;
}

// --- INICIALIZACE APLIKACE ---

// Inicializace aplikace po načtení DOM
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  console.log("DOM načten, inicializace aplikace");
  
  // Přístup k hlavním sekcím aplikace
  loginSection = document.getElementById('login-section');
  registerSection = document.getElementById('register-section');
  appSection = document.getElementById('app-section');
  
  // Inicializace event listenerů pro formuláře
  setupEventListeners();
  
  // Aktualizace zobrazení aktuálního data a času
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  // Kontrola, zda je uživatel přihlášen
  await checkUserSession();
}

// Nastavení event listenerů pro formuláře
function setupEventListeners() {
  // Přihlašovací formuláře
  document.getElementById('email-login-form').addEventListener('submit', handleEmailLogin);
  document.getElementById('rfid-login-form').addEventListener('submit', handleRfidLogin);
  
  // Registrační formulář a odkazy
  document.getElementById('register-link').addEventListener('click', showRegisterForm);
  document.getElementById('back-to-login').addEventListener('click', showLoginForm);
  document.getElementById('register-form').addEventListener('submit', handleRegistration);
  
  // Ovládací prvky aplikace
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('toggle-view-btn').addEventListener('click', toggleAdminView);
  
  // Event delegace pro admin panel
  document.querySelector('.admin-tabs').addEventListener('click', handleTabClick);
  
  console.log("Event listenery nastaveny");
}

// Aktualizace zobrazení aktuálního data a času
function updateDateTime() {
  const datetimeElement = document.getElementById('current-datetime');
  if (datetimeElement) {
    const now = new Date();
    datetimeElement.textContent = now.toLocaleString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// --- AUTENTIZACE ---

// Kontrola, zda je uživatel přihlášen
async function checkUserSession() {
  try {
    // Získání aktuálního uživatele ze session
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error) throw error;
    
    if (user) {
      console.log("Uživatel je přihlášen:", user);
      await fetchUserProfile(user);
      showAppInterface();
    } else {
      console.log("Žádný přihlášený uživatel");
      showLoginForm();
    }
  } catch (error) {
    console.error("Chyba při kontrole session:", error);
    showLoginForm();
  }
}

// Přihlášení pomocí emailu a hesla
async function handleEmailLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    console.log("Úspěšné přihlášení:", data);
    await fetchUserProfile(data.user);
    showAppInterface();
  } catch (error) {
    console.error("Chyba při přihlašování:", error);
    alert(`Chyba při přihlašování: ${error.message}`);
  }
}

// Přihlášení pomocí RFID karty
async function handleRfidLogin(event) {
  event.preventDefault();
  
  const rfidCard = document.getElementById('rfid').value;
  if (!rfidCard) {
    alert("Zadejte číslo RFID karty");
    return;
  }
  
  try {
    // Volání RPC funkce pro přihlášení pomocí RFID
    const { data, error } = await supabaseClient.rpc('login_with_rfid', {
      rfid_code: rfidCard
    });
    
    if (error) throw error;
    
    if (!data || !data.user_id) {
      throw new Error("Karta nebyla nalezena");
    }
    
    // Přihlášení uživatele podle ID
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', data.user_id)
      .single();
    
    if (userError) throw userError;
    
    // Přihlášení pomocí emailu (získaný z profilu)
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: userData.email,
      password: rfidCard // RFID karta je zároveň heslo (ve skutečnosti by to mělo být bezpečnější)
    });
    
    if (authError) throw authError;
    
    console.log("Úspěšné přihlášení pomocí RFID:", authData);
    await fetchUserProfile(authData.user);
    showAppInterface();
  } catch (error) {
    console.error("Chyba při přihlašování pomocí RFID:", error);
    alert(`Chyba při přihlašování: ${error.message}`);
  }
}

// Registrace nového uživatele
async function handleRegistration(event) {
  event.preventDefault();
  
  const email = document.getElementById('reg-email').value;
  const name = document.getElementById('reg-name').value;
  const password = document.getElementById('reg-password').value;
  const passwordConfirm = document.getElementById('reg-password-confirm').value;
  
  // Kontrola hesla
  if (password !== passwordConfirm) {
    alert("Hesla se neshodují");
    return;
  }
  
  try {
    // Registrace uživatele v Auth
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name
        }
      }
    });
    
    if (error) throw error;
    
    // Vytvoření RFID karty (náhodný 8místný kód)
    const rfidCard = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Vytvoření profilu v tabulce profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        name: name,
        credit: 0,
        is_admin: false,
        rfid_card: rfidCard
      })
      .eq('id', data.user.id);
    
    if (profileError) throw profileError;
    
    alert(`Registrace úspěšná! Vaše RFID karta: ${rfidCard}`);
    showLoginForm();
  } catch (error) {
    console.error("Chyba při registraci:", error);
    alert(`Chyba při registraci: ${error.message}`);
  }
}

// Odhlášení uživatele
async function handleLogout() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    showLoginForm();
  } catch (error) {
    console.error("Chyba při odhlašování:", error);
    alert(`Chyba při odhlašování: ${error.message}`);
  }
}

// Načtení profilu uživatele
async function fetchUserProfile(user) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    
    currentUser = {
      id: user.id,
      email: user.email,
      name: data.name || user.email,
      credit: data.credit || 0,
      isAdmin: data.is_admin || false,
      rfidCard: data.rfid_card
    };
    
    console.log("Načten profil uživatele:", currentUser);
  } catch (error) {
    console.error("Chyba při načítání profilu:", error);
    currentUser = {
      id: user.id,
      email: user.email,
      name: user.email,
      credit: 0,
      isAdmin: false
    };
  }
}

// --- NAVIGACE ---

// Zobrazení přihlašovacího formuláře
function showLoginForm() {
  loginSection.classList.remove('hidden');
  registerSection.classList.add('hidden');
  appSection.classList.add('hidden');
}

// Zobrazení registračního formuláře
function showRegisterForm(event) {
  event.preventDefault();
  loginSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  appSection.classList.add('hidden');
}

// Zobrazení hlavního rozhraní aplikace
async function showAppInterface() {
  loginSection.classList.add('hidden');
  registerSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  
  // Aktualizace jména a kreditu uživatele
  document.getElementById('username-display').textContent = currentUser.name;
  document.getElementById('credit-display').textContent = formatCurrency(currentUser.credit);
  
  // Zobrazení nebo skrytí admin panelu podle role
  const adminPanel = document.getElementById('admin-panel');
  if (currentUser.isAdmin) {
    adminPanel.classList.remove('hidden');
    loadAdminPanel();
  } else {
    adminPanel.classList.add('hidden');
  }
  
  // Načtení seznamu produktů
  await loadProducts();
}

// Přepínání mezi uživatelským a admin pohledem
function toggleAdminView() {
  const productsContainer = document.getElementById('products-container');
  const adminPanel = document.getElementById('admin-panel');
  
  if (adminPanel.classList.contains('hidden')) {
    productsContainer.classList.add('hidden');
    adminPanel.classList.remove('hidden');
  } else {
    productsContainer.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  }
}

// Obsluha kliknutí na tab v admin panelu
function handleTabClick(event) {
  if (event.target.classList.contains('tab-btn')) {
    const tabId = event.target.dataset.tab;
    
    // Aktivace správného tabu
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    // Zobrazení správného obsahu tabu
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `${tabId}-tab`);
    });
  }
}

// --- PRODUKTY ---

// Načtení seznamu produktů
async function loadProducts() {
  const productsContainer = document.getElementById('products-container');
  
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    if (data.length === 0) {
      productsContainer.innerHTML = '<p class="text-center">Žádné produkty k dispozici</p>';
      return;
    }
    
    // Vygenerování HTML pro každý produkt
    const productsHtml = data.map(product => `
      <div class="product-card" data-id="${product.id}">
        <img src="${product.image_url || 'img/default-coffee.jpg'}" alt="${product.name}" class="product-image">
        <div class="product-details">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-price">${formatCurrency(product.price)}</p>
          <p class="product-description">${product.description || 'Žádný popis'}</p>
        </div>
      </div>
    `).join('');
    
    productsContainer.innerHTML = productsHtml;
    
    // Přidání event listenerů pro nákup produktů
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => handleProductPurchase(card.dataset.id));
    });
  } catch (error) {
    console.error("Chyba při načítání produktů:", error);
    productsContainer.innerHTML = '<p class="text-center">Chyba při načítání produktů</p>';
  }
}

// Obsluha nákupu produktu
async function handleProductPurchase(productId) {
  try {
    // Načtení detailů produktu
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (productError) throw productError;
    
    // Kontrola, zda má uživatel dostatek kreditu
    if (currentUser.credit < product.price) {
      alert(`Nemáte dostatek kreditu. Potřebujete: ${formatCurrency(product.price)}, máte: ${formatCurrency(currentUser.credit)}`);
      return;
    }
    
    // Potvrzení nákupu
    if (!confirm(`Chcete koupit ${product.name} za ${formatCurrency(product.price)}?`)) {
      return;
    }
    
    // Provedení nákupu pomocí RPC funkce
    const { data, error } = await supabaseClient.rpc('purchase_product', {
      product_id: productId,
      user_id: currentUser.id
    });
    
    if (error) throw error;
    
    // Aktualizace kreditu uživatele
    currentUser.credit -= product.price;
    document.getElementById('credit-display').textContent = formatCurrency(currentUser.credit);
    
    alert(`Úspěšně jste zakoupili ${product.name}. Dobrou chuť!`);
  } catch (error) {
    console.error("Chyba při nákupu produktu:", error);
    alert(`Chyba při nákupu produktu: ${error.message}`);
  }
}

// --- ADMIN FUNKCE ---

// Načtení admin panelu
async function loadAdminPanel() {
  await loadUsersTab();
  await loadProductsTab();
  await loadStatsTab();
}

// Načtení záložky uživatelů
async function loadUsersTab() {
  const usersContainer = document.getElementById('users-tab');
  
  try {
    // Načtení všech uživatelů
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // Vygenerování HTML pro seznam uživatelů
    const usersHtml = `
      <h3>Seznam uživatelů</h3>
      <div class="users-list">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Jméno</th>
              <th>Email</th>
              <th>Kredit</th>
              <th>RFID karta</th>
              <th>Role</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(user => `
              <tr>
                <td>${user.name || 'Bez jména'}</td>
                <td>${user.email || 'Bez emailu'}</td>
                <td>${formatCurrency(user.credit || 0)}</td>
                <td>${user.rfid_card || 'Bez karty'}</td>
                <td>${user.is_admin ? 'Admin' : 'Uživatel'}</td>
                <td>
                  <button class="btn btn-sm" data-action="add-credit" data-user-id="${user.id}">Přidat kredit</button>
                  <button class="btn btn-sm btn-outline" data-action="view-transactions" data-user-id="${user.id}">Transakce</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    // Formulář pro přidání nového uživatele
    const usersFormHtml = `
      <div class="card mt-2">
        <div class="card-header">
          <h3>Přidat nového uživatele</h3>
        </div>
        <div class="card-body">
          <form id="add-user-form">
            <div class="form-group">
              <label for="user-email">Email:</label>
              <input type="email" id="user-email" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="user-name">Jméno:</label>
              <input type="text" id="user-name" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="user-password">Heslo:</label>
              <input type="password" id="user-password" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="user-credit">Počáteční kredit:</label>
              <input type="number" id="user-credit" class="form-control" value="0" min="0" step="1">
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="user-is-admin"> Admin
              </label>
            </div>
            <p><small>RFID karta bude vygenerována automaticky</small></p>
            <button type="submit" class="btn">Přidat uživatele</button>
          </form>
        </div>
      </div>
    `;
    
    usersContainer.innerHTML = usersHtml + usersFormHtml;
    
    // Nastavení event listenerů pro formuláře
    setupAdminEventListeners();
  } catch (error) {
    console.error("Chyba při načítání uživatelů:", error);
    usersContainer.innerHTML = '<p>Došlo k chybě při načítání uživatelů.</p>';
  }
}

// Načtení záložky produktů
async function loadProductsTab() {
  const productsContainer = document.getElementById('products-tab');
  
  try {
    // Načtení všech produktů
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    // Vygenerování HTML pro seznam produktů
    const productsHtml = `
      <h3>Seznam produktů</h3>
      <div class="products-list">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Cena</th>
              <th>Popis</th>
              <th>Obrázek</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(product => `
              <tr>
                <td>${product.name}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.description || 'Bez popisu'}</td>
                <td>${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover;">` : 'Bez obrázku'}</td>
                <td>
                  <button class="btn btn-sm" data-action="edit-product" data-product-id="${product.id}">Upravit</button>
                  <button class="btn btn-sm btn-outline" data-action="delete-product" data-product-id="${product.id}">Smazat</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    // Formulář pro přidání nového produktu
    const productsFormHtml = `
      <div class="card mt-2">
        <div class="card-header">
          <h3>Přidat nový produkt</h3>
        </div>
        <div class="card-body">
          <form id="add-product-form">
            <div class="form-group">
              <label for="product-name">Název:</label>
              <input type="text" id="product-name" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="product-price">Cena (Kč):</label>
              <input type="number" id="product-price" class="form-control" required min="0" step="0.1">
            </div>
            <div class="form-group">
              <label for="product-description">Popis:</label>
              <textarea id="product-description" class="form-control" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="product-image">URL obrázku:</label>
              <input type="url" id="product-image" class="form-control" placeholder="https://example.com/image.jpg">
            </div>
            <button type="submit" class="btn">Přidat produkt</button>
          </form>
        </div>
      </div>
    `;
    
    productsContainer.innerHTML = productsHtml + productsFormHtml;
  } catch (error) {
    console.error("Chyba při načítání produktů:", error);
    productsContainer.innerHTML = '<p>Došlo k chybě při načítání produktů.</p>';
  }
}

// Načtení záložky statistik
async function loadStatsTab() {
  const statsContainer = document.getElementById('stats-tab');
  
  try {
    // Načtení statistik pomocí RPC funkce
    const { data, error } = await supabaseClient.rpc('get_system_stats');
    
    if (error) throw error;
    
    // Zobrazení statistik
    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h4>Celkový stav pokladny</h4>
          <p class="stat-value">${formatCurrency(data.total_cash || 0)}</p>
        </div>
        <div class="stat-card">
          <h4>Počet uživatelů</h4>
          <p class="stat-value">${data.user_count || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Počet prodaných káv</h4>
          <p class="stat-value">${data.transaction_count || 0}</p>
        </div>
        <div class="stat-card">
          <h4>Průměrná cena kávy</h4>
          <p class="stat-value">${formatCurrency(data.avg_price || 0)}</p>
        </div>
      </div>
      
      <h3 class="mt-2">Nejpopulárnější kávy</h3>
      <div class="popular-products">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Název</th>
              <th>Počet prodaných</th>
              <th>Celková hodnota</th>
            </tr>
          </thead>
          <tbody>
            ${data.popular_products ? data.popular_products.map(product => `
              <tr>
                <td>${product.name}</td>
                <td>${product.count}</td>
                <td>${formatCurrency(product.total_value)}</td>
              </tr>
            `).join('') : '<tr><td colspan="3">Žádná data</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <h3 class="mt-2">Poslední transakce</h3>
      <div class="recent-transactions">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Uživatel</th>
              <th>Produkt</th>
              <th>Částka</th>
            </tr>
          </thead>
          <tbody>
            ${data.recent_transactions ? data.recent_transactions.map(tx => `
              <tr>
                <td>${formatDate(tx.created_at)}</td>
                <td>${tx.user_name}</td>
                <td>${tx.product_name}</td>
                <td>${formatCurrency(tx.amount)}</td>
              </tr>
            `).join('') : '<tr><td colspan="4">Žádná data</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Chyba při načítání statistik:", error);
    statsContainer.innerHTML = '<p>Došlo k chybě při načítání statistik.</p>';
  }
}

// Nastavení event listenerů pro admin panel
function setupAdminEventListeners() {
  console.log("Nastavuji event listenery pro admin panel");
  
  // Přidání produktu
  const addProductForm = document.getElementById('add-product-form');
  if (addProductForm) {
    addProductForm.addEventListener('submit', handleAddProduct);
  }
  
  // Přidání uživatele
  const addUserForm = document.getElementById('add-user-form');
  if (addUserForm) {
    addUserForm.addEventListener('submit', handleAddUser);
  }
  
  // Delegace událostí pro tlačítka v tabulkách
  document.querySelectorAll('.admin-table').forEach(table => {
    table.addEventListener('click', handleAdminTableAction);
  });
}

// Obsluha přidání nového produktu
async function handleAddProduct(event) {
  event.preventDefault();
  
  const name = document.getElementById('product-name').value;
  const price = parseFloat(document.getElementById('product-price').value);
  const description = document.getElementById('product-description').value;
  const imageUrl = document.getElementById('product-image').value;
  
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .insert([
        {
          name: name,
          price: price,
          description: description,
          image_url: imageUrl || null
        }
      ]);
    
    if (error) throw error;
    
    alert('Produkt byl úspěšně přidán');
    document.getElementById('add-product-form').reset();
    loadProductsTab();
    loadProducts();
  } catch (error) {
    console.error("Chyba při přidávání produktu:", error);
    alert(`Chyba při přidávání produktu: ${error.message}`);
  }
}

// Obsluha přidání nového uživatele
async function handleAddUser(event) {
  event.preventDefault();
  
  const email = document.getElementById('user-email').value;
  const name = document.getElementById('user-name').value;
  const password = document.getElementById('user-password').value;
  const credit = parseFloat(document.getElementById('user-credit').value || 0);
  const isAdmin = document.getElementById('user-is-admin').checked;
  
  try {
    // Registrace uživatele v Auth
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name
        }
      }
    });
    
    if (error) throw error;
    
    // Vytvoření RFID karty (náhodný 8místný kód)
    const rfidCard = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Aktualizace profilu
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        name: name,
        credit: credit,
        is_admin: isAdmin,
        rfid_card: rfidCard
      })
      .eq('id', data.user.id);
    
    if (updateError) throw updateError;
    
    // Pokud byl přidán kredit, aktualizujeme stav pokladny
    if (credit > 0) {
      const { error: creditError } = await supabaseClient.rpc('update_user_credit', {
        user_id: data.user.id,
        amount: credit
      });
      
      if (creditError) throw creditError;
    }
    
    alert(`Uživatel byl úspěšně přidán. RFID karta: ${rfidCard}`);
    document.getElementById('add-user-form').reset();
    loadUsersTab();
  } catch (error) {
    console.error("Chyba při přidávání uživatele:", error);
    alert(`Chyba při přidávání uživatele: ${error.message}`);
  }
}

// Obsluha akce v tabulce (delegace událostí)
async function handleAdminTableAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  
  const action = button.dataset.action;
  
  switch (action) {
    case 'add-credit':
      handleAddCredit(button.dataset.userId);
      break;
    case 'view-transactions':
      handleViewTransactions(button.dataset.userId);
      break;
    case 'edit-product':
      handleEditProduct(button.dataset.productId);
      break;
    case 'delete-product':
      handleDeleteProduct(button.dataset.productId);
      break;
  }
}

// Obsluha přidání kreditu uživateli
async function handleAddCredit(userId) {
  const amount = prompt("Zadejte částku k přidání (v Kč):");
  if (!amount) return;
  
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    alert("Neplatná částka");
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.rpc('update_user_credit', {
      user_id: userId,
      amount: parsedAmount
    });
    
    if (error) throw error;
    
    alert(`Kredit byl úspěšně přidán: ${formatCurrency(parsedAmount)}`);
    loadUsersTab();
    loadStatsTab();
  } catch (error) {
    console.error("Chyba při přidávání kreditu:", error);
    alert(`Chyba při přidávání kreditu: ${error.message}`);
  }
}

// Obsluha zobrazení transakcí uživatele
async function handleViewTransactions(userId) {
  try {
    // Získání jména uživatele
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // Získání transakcí uživatele
    const { data, error } = await supabaseClient.rpc('get_user_transactions', {
      user_id: userId
    });
    
    if (error) throw error;
    
    // Zobrazení modálního okna s transakcemi
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.getElementById('modal-overlay');
    
    modalTitle.textContent = `Transakce uživatele: ${userData.name}`;
    
    if (!data || data.length === 0) {
      modalContent.innerHTML = '<p>Žádné transakce</p>';
    } else {
      modalContent.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Produkt</th>
              <th>Částka</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(tx => `
              <tr>
                <td>${formatDate(tx.created_at)}</td>
                <td>${tx.product_name}</td>
                <td>${formatCurrency(tx.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    modalOverlay.classList.remove('hidden');
    
    // Nastavení zavírání modálního okna
    document.getElementById('modal-close').addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
    });
  } catch (error) {
    console.error("Chyba při načítání transakcí:", error);
    alert(`Chyba při načítání transakcí: ${error.message}`);
  }
}

// Obsluha úpravy produktu
async function handleEditProduct(productId) {
  try {
    // Načtení detailů produktu
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error) throw error;
    
    // Vytvoření formuláře pro editaci
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.getElementById('modal-overlay');
    
    modalTitle.textContent = `Upravit produkt: ${data.name}`;
    modalContent.innerHTML = `
      <form id="edit-product-form">
        <input type="hidden" id="edit-product-id" value="${productId}">
        <div class="form-group">
          <label for="edit-product-name">Název:</label>
          <input type="text" id="edit-product-name" class="form-control" value="${data.name}" required>
        </div>
        <div class="form-group">
          <label for="edit-product-price">Cena (Kč):</label>
          <input type="number" id="edit-product-price" class="form-control" value="${data.price}" required min="0" step="0.1">
        </div>
        <div class="form-group">
          <label for="edit-product-description">Popis:</label>
          <textarea id="edit-product-description" class="form-control" rows="3">${data.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-product-image">URL obrázku:</label>
          <input type="url" id="edit-product-image" class="form-control" value="${data.image_url || ''}" placeholder="https://example.com/image.jpg">
        </div>
        <button type="submit" class="btn">Uložit změny</button>
      </form>
    `;
    
    modalOverlay.classList.remove('hidden');
    
    // Nastavení zavírání modálního okna
    document.getElementById('modal-close').addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
    });
    
    // Nastavení formuláře pro úpravu
    document.getElementById('edit-product-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const editedProduct = {
        name: document.getElementById('edit-product-name').value,
        price: parseFloat(document.getElementById('edit-product-price').value),
        description: document.getElementById('edit-product-description').value,
        image_url: document.getElementById('edit-product-image').value || null
      };
      
      try {
        const { error } = await supabaseClient
          .from('products')
          .update(editedProduct)
          .eq('id', productId);
        
        if (error) throw error;
        
        alert('Produkt byl úspěšně upraven');
        modalOverlay.classList.add('hidden');
        loadProductsTab();
        loadProducts();
      } catch (error) {
        console.error("Chyba při úpravě produktu:", error);
        alert(`Chyba při úpravě produktu: ${error.message}`);
      }
    });
  } catch (error) {
    console.error("Chyba při načítání detailů produktu:", error);
    alert(`Chyba při načítání detailů produktu: ${error.message}`);
  }
}

// Obsluha smazání produktu
async function handleDeleteProduct(productId) {
  if (!confirm("Opravdu chcete smazat tento produkt?")) {
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) throw error;
    
    alert('Produkt byl úspěšně smazán');
    loadProductsTab();
    loadProducts();
  } catch (error) {
    console.error("Chyba při mazání produktu:", error);
    alert(`Chyba při mazání produktu: ${error.message}`);
  }
}