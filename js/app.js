
// Inicializace Supabase klienta
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
let loginSection, registerSection, mainContent;

// Hlavní aplikační logika - spouští se po načtení DOM
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM byl načten, inicializuji aplikaci...");
  
  // Kontrola, zda Supabase existuje
  if (!supabaseClient) {
    console.error("Supabase klient není k dispozici!");
    alert("Chyba: Supabase knihovna se nenačetla");
    return;
  }
  
  // Inicializace referencí na DOM elementy
  loginSection = document.getElementById('login-section');
  registerSection = document.getElementById('register-section');
  mainContent = document.getElementById('main-content');
  mainContentWrapper = document.getElementById('main-content-wrapper');
  
  if (!loginSection || !registerSection || !mainContent) {
    console.error("Nepodařilo se najít základní DOM elementy!");
    alert("Chyba: Nepodařilo se najít základní DOM elementy");
    return;
  }
  
  // Inicializace aplikace
  initApp();
  
  // Nastavení event listenerů
  setupEventListeners();
  
  // Zobrazení aktuálního data a času
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  console.log("Inicializace aplikace dokončena");
});

// Aktualizace data a času
function updateDateTime() {
  const dateTimeElement = document.getElementById('current-datetime');
  if (dateTimeElement) {
    const now = new Date();
    dateTimeElement.textContent = now.toLocaleString('cs-CZ');
  }
}

// Zobrazení upozornění
function showAlert(message, type = 'info') {
  console.log(`Alert: ${message} (${type})`);
  
  // Vytvoření elementu pro upozornění
  const alertElement = document.createElement('div');
  alertElement.className = `alert alert-${type}`;
  alertElement.textContent = message;
  
  // Přidání elementu do DOM
  const alertContainer = document.querySelector('.alert-container') || document.createElement('div');
  if (!alertContainer.classList.contains('alert-container')) {
    alertContainer.className = 'alert-container';
    document.body.appendChild(alertContainer);
  }
  
  alertContainer.appendChild(alertElement);
  
  // Automatické odstranění upozornění po 3 sekundách
  setTimeout(() => {
    alertElement.style.opacity = '0';
    setTimeout(() => alertElement.remove(), 500);
  }, 3000);
}

// Správce stavu aplikace
const AppState = {
  currentUser: null,
  userProfile: null,
  products: [],
  
  // Načtení aktuálního uživatele
  async getCurrentUser() {
    try {
      // Získání aktuálně přihlášeného uživatele
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error) {
        console.error('Chyba při získávání uživatele:', error);
        return null;
      }
      
      if (!user) {
        console.log("Žádný uživatel není přihlášen");
        return null;
      }
      
      console.log("Uživatel nalezen:", user);
      
      // Načtení profilu uživatele
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Chyba při načítání profilu:', profileError);
        return null;
      }
      
      console.log("Profil načten:", profile);
      
      // Uložení dat do stavu
      this.currentUser = user;
      this.userProfile = profile;
      
      return user;
    } catch (error) {
      console.error("Neočekávaná chyba při načítání uživatele:", error);
      return null;
    }
  },
  
  // Načtení produktů
  async loadProducts() {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id');
      
      if (error) {
        console.error('Chyba při načítání produktů:', error);
        return [];
      }
      
      console.log("Produkty načteny:", data.length);
      
      this.products = data;
      return data;
    } catch (error) {
      console.error("Neočekávaná chyba při načítání produktů:", error);
      return [];
    }
  }
};

// Autentizační funkce
const Auth = {
  // Registrace nového uživatele
  async register(name, email, password, rfidCard = null) {
    console.log("Registrace uživatele:", email);
    
    try {
      // Vytvoření uživatele v auth
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });
      
      if (error) {
        console.error('Chyba při registraci:', error);
        return { success: false, error: error.message };
      }
      
      if (!data.user) {
        console.error('Registrace selhala: Uživatel nebyl vytvořen');
        return { success: false, error: 'Nepodařilo se vytvořit uživatele' };
      }
      
      console.log("Uživatel byl vytvořen v auth systému:", data.user.id);
      
      // Vytvoření profilu
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: data.user.id,
          name,
          email,
          credit: 100, // Začáteční kredit
          is_admin: false,
          rfid_card: rfidCard || generateRandomRfid()
        }]);
      
      if (profileError) {
        console.error('Chyba při vytváření profilu:', profileError);
        return { success: false, error: `Chyba při vytváření profilu: ${profileError.message}` };
      }
      
      console.log("Profil byl úspěšně vytvořen");
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Neočekávaná chyba při registraci:', error);
      return { success: false, error: `Neočekávaná chyba: ${error.message}` };
    }
  },
  
  // Přihlášení uživatele
  async login(email, password) {
    console.log("Přihlašování uživatele:", email);
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Chyba při přihlášení:', error);
        return { success: false, error: error.message };
      }
      
      if (!data.user) {
        console.error('Přihlášení selhalo: Chybí uživatelská data');
        return { success: false, error: 'Přihlášení selhalo' };
      }
      
      console.log("Přihlášení úspěšné:", data.user.id);
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Neočekávaná chyba při přihlášení:', error);
      return { success: false, error: `Neočekávaná chyba: ${error.message}` };
    }
  },
  
  // Přihlášení pomocí RFID karty
  async loginWithRfid(rfidCard) {
    console.log("Přihlašování pomocí RFID:", rfidCard);
    
    try {
      // Použití RPC funkce pro přihlášení pomocí RFID
      const { data, error } = await supabaseClient
        .rpc('login_with_rfid', { rfid_param: rfidCard });
      
      if (error) {
        console.error('Chyba při RFID přihlášení:', error);
        return { success: false, error: error.message };
      }
      
      if (!data.success) {
        console.log("RFID přihlášení selhalo:", data.error);
        return { success: false, error: data.error };
      }
      
      console.log("RFID přihlášení úspěšné:", data);
      
      // Nastavení aplikačního stavu
      const profile = {
        id: data.user_id,
        email: data.email,
        name: data.name,
        credit: data.credit,
        is_admin: data.is_admin,
        rfid_card: data.rfid_card
      };
      
      // Nastavení stavu aplikace
      AppState.currentUser = { id: profile.id, email: profile.email };
      AppState.userProfile = profile;
      
      return { 
        success: true, 
        user: { id: profile.id, email: profile.email }, 
        profile: profile
      };
    } catch (error) {
      console.error('Neočekávaná chyba při RFID přihlášení:', error);
      return { success: false, error: `Neočekávaná chyba: ${error.message}` };
    }
  },
  
  // Odhlášení uživatele
  async logout() {
    console.log("Odhlašování uživatele");
    
    try {
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        console.error('Chyba při odhlášení:', error);
        return false;
      }
      
      // Vyčištění stavu aplikace
      AppState.currentUser = null;
      AppState.userProfile = null;
      
      console.log("Odhlášení úspěšné");
      return true;
    } catch (error) {
      console.error('Neočekávaná chyba při odhlášení:', error);
      return false;
    }
  }
};

// Inicializace aplikace
async function initApp() {
  console.log("Inicializace aplikace...");
  
  try {
    // Kontrola přihlášení
    const user = await AppState.getCurrentUser();
    console.log("Aktuální uživatel:", user ? "přihlášen" : "nepřihlášen");
    
    // Načtení produktů
    await AppState.loadProducts();
    
    // Aktualizace UI podle stavu přihlášení
    updateUIForAuthState();
    
    console.log("Inicializace aplikace dokončena");
  } catch (error) {
    console.error("Chyba při inicializaci aplikace:", error);
    showAlert("Došlo k chybě při inicializaci aplikace. Zkuste obnovit stránku.", "danger");
  }
}

// Aktualizace UI podle stavu přihlášení
function updateUIForAuthState() {
  console.log("Aktualizuji UI podle stavu přihlášení");
  
  if (AppState.currentUser && AppState.userProfile) {
    // Uživatel je přihlášen
    loginSection.style.display = 'none';
    registerSection.style.display = 'none';
    mainContentWrapper.style.display = 'flex';
    mainContent.style.display = 'block';
    
    // Zobrazení informací o uživateli
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      userInfo.innerHTML = `
        <div class="user-info">
          <span class="user-name">${AppState.userProfile.name}</span>
          <div class="user-credit">Kredit: ${AppState.userProfile.credit} Kč</div>
          <button id="logout-btn" class="btn btn-secondary btn-sm">Odhlásit se</button>
        </div>
      `;
      
      // Přidání event listeneru pro odhlášení
      document.getElementById('logout-btn').addEventListener('click', async function() {
        const success = await Auth.logout();
        if (success) {
          updateUIForAuthState();
          showAlert('Byli jste úspěšně odhlášeni', 'success');
        } else {
          showAlert('Odhlášení se nezdařilo', 'danger');
        }
      });
    }
    
    // Zobrazení admin záložky pro adminy
    const adminTab = document.getElementById('admin-tab');
    if (adminTab && AppState.userProfile.is_admin) {
      adminTab.style.display = 'block';
    } else if (adminTab) {
      adminTab.style.display = 'none';
    }
    
    // Vykreslení produktů
    renderProducts();
    
    // Aktivace záložky "Nabídka kávy" po přihlášení
    activateTab('coffee-panel');
    
    // Načtení transakcí a statistik
    setTimeout(() => {
      renderUserTransactions();
      renderStats();
      if (AppState.userProfile && AppState.userProfile.is_admin) {
        renderAdminPanel();
      }
    }, 500);
  } else {
    // Uživatel není přihlášen
    mainContentWrapper.style.display = 'none';
    mainContent.style.display = 'none';
    
    // Vyčištění přihlašovacích polí
    const loginEmailInput = document.getElementById('login-email-password');
    const loginPasswordInput = document.getElementById('login-password');
    const loginRfidInput = document.getElementById('login-rfid');
    
    if (loginEmailInput) loginEmailInput.value = '';
    if (loginPasswordInput) loginPasswordInput.value = '';
    if (loginRfidInput) loginRfidInput.value = '';
    
    // Vyčištění registračních polí
    const registerNameInput = document.getElementById('register-name');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmInput = document.getElementById('register-password-confirm');
    
    if (registerNameInput) registerNameInput.value = '';
    if (registerEmailInput) registerEmailInput.value = '';
    if (registerPasswordInput) registerPasswordInput.value = '';
    if (registerConfirmInput) registerConfirmInput.value = '';
    
    // Zobrazení správné přihlašovací sekce
    if (window.location.hash === '#register') {
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    } else {
      loginSection.style.display = 'block';
      registerSection.style.display = 'none';
    }
  }
}

// Vykreslení produktů
function renderProducts() {
  console.log("Vykreslení produktů");
  
  const productsContainer = document.getElementById('coffee-products');
  if (!productsContainer) {
    console.error("Element 'coffee-products' nebyl nalezen");
    return;
  }
  
  let html = '';
  
  if (!AppState.products || AppState.products.length === 0) {
    html = '<p>Žádné produkty k dispozici.</p>';
  } else {
    AppState.products.forEach(product => {
      html += `
        <div class="coffee-product">
          <img src="${product.image}" alt="${product.name}">
          <div class="coffee-product-info">
            <h3>${product.name}</h3>
            <p class="coffee-price">${product.price} Kč</p>
            <p class="coffee-description">${product.description || ''}</p>
            <button class="btn buy-coffee-btn" data-product-id="${product.id}">Koupit</button>
          </div>
        </div>
      `;
    });
  }
  
  productsContainer.innerHTML = html;
}

// Vykreslení transakcí uživatele
async function renderUserTransactions() {
  console.log("Vykreslení transakcí uživatele");
  
  const transactionsContainer = document.getElementById('user-transactions');
  if (!transactionsContainer) {
    console.error("Element 'user-transactions' nebyl nalezen");
    return;
  }
  
  if (!AppState.currentUser) {
    transactionsContainer.innerHTML = '<p>Není přihlášen žádný uživatel.</p>';
    return;
  }
  
  try {
    // Použití RPC funkce pro načtení transakcí
    const { data: transactions, error } = await supabaseClient
      .rpc('get_user_transactions', { user_id_param: AppState.currentUser.id });
    
    if (error) {
      console.error('Chyba při načítání transakcí:', error);
      transactionsContainer.innerHTML = '<p>Došlo k chybě při načítání transakcí.</p>';
      return;
    }
    
    let html = '';
    
    if (!transactions || transactions.length === 0) {
      html = '<p>Nemáte žádné transakce.</p>';
    } else {
      html = `
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Produkt</th>
              <th>Cena</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      transactions.forEach(transaction => {
        const date = new Date(transaction.created_at).toLocaleString('cs-CZ');
        const productName = transaction.product_name || 'Neznámý produkt';
        
        html += `
          <tr>
            <td>${date}</td>
            <td>${productName}</td>
            <td>${transaction.amount} Kč</td>
          </tr>
        `;
      });
      
      html += `
          </tbody>
        </table>
      `;
    }
    
    transactionsContainer.innerHTML = html;
  } catch (error) {
    console.error("Neočekávaná chyba při načítání transakcí:", error);
    transactionsContainer.innerHTML = '<p>Došlo k chybě při načítání transakcí.</p>';
  }
}

// Vykreslení statistik
async function renderStats() {
  console.log("Vykreslení statistik");
  
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) {
    console.error("Element 'stats-container' nebyl nalezen");
    return;
  }
  
  try {
    // Získání statistik
    const stats = await getStats();
    
    let html = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-title">Stav pokladny</div>
          <div class="stat-value">${stats.cashAmount} Kč</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">☕</div>
          <div class="stat-title">Počet produktů</div>
          <div class="stat-value">${stats.productsCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-title">Celkem transakcí</div>
          <div class="stat-value">${stats.transactionsCount}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💵</div>
          <div class="stat-title">Celkový obrat</div>
          <div class="stat-value">${stats.totalRevenue} Kč</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-title">Aktivní uživatelé</div>
          <div class="stat-value">${stats.activeUsers}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-title">Nejpopulárnější káva</div>
          <div class="stat-value">${stats.mostPopularProduct?.name || 'Žádná'}</div>
        </div>
      </div>
    `;
    
    statsContainer.innerHTML = html;
  } catch (error) {
    console.error("Chyba při vykreslování statistik:", error);
    statsContainer.innerHTML = '<p>Došlo k chybě při načítání statistik.</p>';
  }
}

// Získání statistik
async function getStats() {
  console.log("Získávání statistik");
  
  try {
    // Použití RPC funkce pro získání statistik
    const { data: stats, error } = await supabaseClient
      .rpc('get_system_stats');
    
    if (error) {
      console.error("Chyba při získávání statistik:", error);
      throw error;
    }
    
    return {
      productsCount: stats.productsCount || 0,
      transactionsCount: stats.transactionsCount || 0,
      totalRevenue: stats.totalRevenue || 0,
      activeUsers: stats.activeUsers || 0,
      mostPopularProduct: { name: stats.mostPopularProduct || 'Žádná' },
      cashAmount: stats.cashAmount || 0
    };
  } catch (error) {
    console.error("Chyba při získávání statistik:", error);
    return {
      productsCount: 0,
      transactionsCount: 0,
      totalRevenue: 0,
      activeUsers: 0,
      mostPopularProduct: { name: 'Žádná' },
      cashAmount: 0
    };
  }
}

// Vykreslení admin panelu
async function renderAdminPanel() {
  console.log("Vykreslení admin panelu");
  
  const usersContainer = document.getElementById('admin-users');
  const productsContainer = document.getElementById('admin-products');
  
  if (!usersContainer || !productsContainer) {
    console.error("Admin panel elementy nebyly nalezeny");
    return;
  }
  
  if (!AppState.userProfile || !AppState.userProfile.is_admin) {
    usersContainer.innerHTML = '<p>Nemáte oprávnění k administraci.</p>';
    productsContainer.innerHTML = '';
    return;
  }
  
  try {
    // Deklarace usersHtml na počátku funkce
    let usersHtml = '';
    
    // Načtení uživatelů
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('name');
    
    if (usersError) {
      console.error('Chyba při načítání uživatelů:', usersError);
      usersContainer.innerHTML = '<p>Chyba při načítání uživatelů.</p>';
    } else {
      // Vykreslení tabulky uživatelů
      usersHtml = `
        <h3>Správa uživatelů</h3>
        <table>
          <thead>
            <tr>
              <th>Jméno</th>
              <th>Email</th>
              <th>RFID</th>
              <th>Kredit</th>
              <th>Admin</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      users.forEach(user => {
        usersHtml += `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.rfid_card || 'Není nastaveno'}</td>
            <td>${user.credit} Kč</td>
            <td>${user.is_admin ? 'Ano' : 'Ne'}</td>
            <td>
              <button class="btn btn-sm btn-secondary add-credit-btn" data-user-id="${user.id}">
                Přidat kredit
              </button>
              <button class="btn btn-sm btn-secondary change-rfid-btn" data-user-id="${user.id}" data-rfid="${user.rfid_card || ''}">
                RFID
              </button>
              <button class="btn btn-sm ${user.is_admin ? 'btn-danger' : 'btn-secondary'} toggle-admin-btn" 
                data-user-id="${user.id}" data-is-admin="${user.is_admin}">
                ${user.is_admin ? 'Odebrat admin' : 'Nastavit admin'}
              </button>
            </td>
          </tr>
        `;
      });
      
      usersHtml += `
          </tbody>
        </table>
      `;
      
      usersContainer.innerHTML = usersHtml;
    }
    
    // Vykreslení tabulky produktů
    let productsHtml = `
      <h3>Správa produktů</h3>
      <table>
        <thead>
          <tr>
            <th>Název</th>
            <th>Cena</th>
            <th>Popis</th>
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    AppState.products.forEach(product => {
      productsHtml += `
        <tr>
          <td>${product.name}</td>
          <td>${product.price} Kč</td>
          <td>${product.description || ''}</td>
          <td>
            <button class="btn btn-sm btn-danger delete-product-btn" data-product-id="${product.id}">
              Smazat
            </button>
          </td>
        </tr>
      `;
    });
    
    productsHtml += `
        </tbody>
      </table>
    `;
    
    // Přidání formuláře pro nové produkty
    productsHtml += `
      <div class="card mt-3">
        <div class="card-header">
          <h3>Přidat produkt</h3>
        </div>
        <div class="card-body">
          <form id="add-product-form">
            <div class="form-group">
              <label for="product-name">Název:</label>
              <input type="text" id="product-name" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="product-price">Cena:</label>
              <input type="number" id="product-price" class="form-control" required min="1">
            </div>
            <div class="form-group">
              <label for="product-description">Popis:</label>
              <textarea id="product-description" class="form-control"></textarea>
            </div>
            <div class="form-group">
              <label for="product-image">Obrázek:</label>
              <select id="product-image" class="form-control">
                <option value="img/coffee-1576552_1280.jpeg">Kávová zrna 1</option>
                <option value="img/coffee-1324126_1280.jpeg">Kávová zrna 2</option>
                <option value="img/coffee-5037800_1280.jpeg">Šálek kávy 1</option>
                <option value="img/caffeine-1866758_1280.jpeg">Šálek kávy 2</option>
              </select>
            </div>
            <button type="submit" class="btn">Přidat produkt</button>
          </form>
        </div>
      </div>
    `;
    
    productsContainer.innerHTML = productsHtml;
    

    
    // Přidání formuláře pro nové uživatele
    let usersFormHtml = `
      <div class="card mt-3">
        <div class="card-header">
          <h3>Přidat uživatele</h3>
        </div>
        <div class="card-body">
          <form id="add-user-form">
            <div class="form-group">
              <label for="user-name">Jméno:</label>
              <input type="text" id="user-name" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="user-email">Email:</label>
              <input type="email" id="user-email" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="user-password">Heslo:</label>
              <input type="password" id="user-password" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="user-credit">Kredit:</label>
              <input type="number" id="user-credit" class="form-control" value="100" min="0">
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
    console.error("Chyba při vykreslování admin panelu:", error);
    usersContainer.innerHTML = '<p>Došlo k chybě při načítání admin panelu.</p>';
    productsContainer.innerHTML = '';
  }
}

// Nastavení event listenerů pro admin panel
function setupAdminEventListeners() {
  console.log("Nastavuji event listenery pro admin panel");
  
  // Přidání produktu
  const addProductForm = document.getElementById('add-product-form');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Přidávání produktu");
      
      const name = document.getElementById('product-name').value;
      const price = Number(document.getElementById('product-price').value);
      const description = document.getElementById('product-description').value;
      const image = document.getElementById('product-image').value;
      
      try {
        const { data, error } = await supabaseClient
          .from('products')
          .insert([{ name, price, description, image }])
          .select()
          .single();
        
        if (error) {
          console.error('Chyba při přidávání produktu:', error);
          showAlert('Přidání produktu se nezdařilo: ' + error.message, 'danger');
          return;
        }
        
        // Aktualizace seznamu produktů
        await AppState.loadProducts();
        renderProducts();
        renderAdminPanel();
        
        showAlert('Produkt byl úspěšně přidán', 'success');
      } catch (error) {
        console.error('Neočekávaná chyba při přidávání produktu:', error);
        showAlert('Došlo k chybě při přidávání produktu', 'danger');
      }
    });
  }
  
  // Přidání uživatele
  const addUserForm = document.getElementById('add-user-form');
  if (addUserForm) {
    addUserForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Přidávání uživatele");
      
      const name = document.getElementById('user-name').value;
      const email = document.getElementById('user-email').value;
      const password = document.getElementById('user-password').value;
      const credit = Number(document.getElementById('user-credit').value);
      const isAdmin = document.getElementById('user-is-admin').checked;
      
      try {
        // Registrace uživatele
        const result = await Auth.register(name, email, password, generateRandomRfid());
        
        if (result.success) {
          // Nastavení kreditu a admin role
          if (credit !== 100) {
            const { error: creditError } = await supabaseClient
              .from('profiles')
              .update({ credit: credit })
              .eq('id', result.user.id);
            
            if (creditError) {
              console.error('Chyba při nastavování kreditu:', creditError);
            }
          }
          
          if (isAdmin) {
            const { error: adminError } = await supabaseClient
              .from('profiles')
              .update({ is_admin: true })
              .eq('id', result.user.id);
            
            if (adminError) {
              console.error('Chyba při nastavování admin role:', adminError);
            }
          }
          
          renderAdminPanel();
          showAlert('Uživatel byl úspěšně přidán', 'success');
        } else {
          showAlert('Přidání uživatele se nezdařilo: ' + result.error, 'danger');
        }
      } catch (error) {
        console.error('Neočekávaná chyba při přidávání uživatele:', error);
        showAlert('Došlo k chybě při přidávání uživatele', 'danger');
      }
    });
  }
  
  // Event listenery pro admin akce (přidáváme pouze jednou)
  if (!window.adminEventListenersSetup) {
    window.adminEventListenersSetup = true;
    document.addEventListener('click', async function(e) {
    // Přidání kreditu
    if (e.target && e.target.classList.contains('add-credit-btn')) {
      const userId = e.target.dataset.userId;
      const amount = prompt('Zadejte částku k přidání:');
      
      if (amount && !isNaN(amount) && Number(amount) > 0) {
        try {
          // Zakázání tlačítka během zpracování
          e.target.disabled = true;
          e.target.textContent = 'Zpracovávám...';
          
          const { error } = await supabaseClient
            .rpc('update_user_credit', { 
              user_id_param: userId, 
              amount_to_add: Number(amount) 
            });
          
          if (error) {
            console.error('Chyba při přidávání kreditu:', error);
            showAlert('Přidání kreditu se nezdařilo', 'danger');
          } else {
            renderAdminPanel();
            // Aktualizace statistik po přidání kreditu
            setTimeout(() => {
              renderStats();
            }, 200);
            showAlert(`Kredit ${amount} Kč byl úspěšně přidán`, 'success');
          }
          
          // Povolení tlačítka zpět
          setTimeout(() => {
            e.target.disabled = false;
            e.target.textContent = 'Přidat kredit';
          }, 1000);
        } catch (error) {
          console.error('Neočekávaná chyba při přidávání kreditu:', error);
          showAlert('Došlo k chybě při přidávání kreditu', 'danger');
        }
      }
    }
    
    // Změna RFID
    if (e.target && e.target.classList.contains('change-rfid-btn')) {
      const userId = e.target.dataset.userId;
      const currentRfid = e.target.dataset.rfid || '';
      const newRfid = prompt('Zadejte nové RFID číslo:', currentRfid);
      
      if (newRfid !== null) {
        try {
          const { error } = await supabaseClient
            .from('profiles')
            .update({ rfid_card: newRfid })
            .eq('id', userId);
          
          if (error) {
            console.error('Chyba při změně RFID:', error);
            showAlert('Změna RFID se nezdařila', 'danger');
          } else {
            renderAdminPanel();
            showAlert('RFID karta byla úspěšně změněna', 'success');
          }
        } catch (error) {
          console.error('Neočekávaná chyba při změně RFID:', error);
          showAlert('Došlo k chybě při změně RFID', 'danger');
        }
      }
    }
    
    // Přepnutí admin role
    if (e.target && e.target.classList.contains('toggle-admin-btn')) {
      const userId = e.target.dataset.userId;
      const isAdmin = e.target.dataset.isAdmin === 'true';
      const newAdminStatus = !isAdmin;
      
      try {
        const { error } = await supabaseClient
          .from('profiles')
          .update({ is_admin: newAdminStatus })
          .eq('id', userId);
        
        if (error) {
          console.error('Chyba při změně admin role:', error);
          showAlert('Změna admin role se nezdařila', 'danger');
        } else {
          renderAdminPanel();
          showAlert(`Admin role byla ${newAdminStatus ? 'přidána' : 'odebrána'}`, 'success');
        }
      } catch (error) {
        console.error('Neočekávaná chyba při změně admin role:', error);
        showAlert('Došlo k chybě při změně admin role', 'danger');
      }
    }
    
    // Smazání produktu
    if (e.target && e.target.classList.contains('delete-product-btn')) {
      const productId = e.target.dataset.productId;
      
      if (confirm('Opravdu chcete smazat tento produkt?')) {
        try {
          const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);
          
          if (error) {
            console.error('Chyba při mazání produktu:', error);
            showAlert('Smazání produktu se nezdařilo', 'danger');
          } else {
            await AppState.loadProducts();
            renderProducts();
            renderAdminPanel();
            showAlert('Produkt byl úspěšně smazán', 'success');
          }
        } catch (error) {
          console.error('Neočekávaná chyba při mazání produktu:', error);
          showAlert('Došlo k chybě při mazání produktu', 'danger');
        }
      }
    }
    });
  }
}

// Generování náhodného RFID čísla
function generateRandomRfid() {
  let rfid = '';
  for (let i = 0; i < 8; i++) {
    rfid += Math.floor(Math.random() * 10);
  }
  return rfid;
}

// Nastavení event listenerů
function setupEventListeners() {
  console.log("Nastavuji event listenery");
  
  // Přepínání mezi přihlášením a registrací
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.hash = 'register';
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    });
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.hash = '';
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
    });
  }
  
  // Přihlášení heslem
  const loginFormPassword = document.getElementById('login-form-password');
  if (loginFormPassword) {
    loginFormPassword.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Odesílání formuláře pro přihlášení heslem");
      
      const emailInput = document.getElementById('login-email-password');
      const passwordInput = document.getElementById('login-password');
      
      if (!emailInput || !passwordInput) {
        showAlert('Chyba ve formuláři', 'danger');
        return;
      }
      
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      if (!email || !password) {
        showAlert('Zadejte email a heslo', 'warning');
        return;
      }
      
      try {
        const result = await Auth.login(email, password);
        
        if (result.success) {
          await AppState.getCurrentUser();
          updateUIForAuthState();
          showAlert('Přihlášení proběhlo úspěšně', 'success');
        } else {
          showAlert('Přihlášení se nezdařilo: ' + result.error, 'danger');
        }
      } catch (error) {
        console.error("Chyba při přihlášení:", error);
        showAlert('Došlo k chybě při přihlášení', 'danger');
      }
    });
  }
  
  // Přihlášení RFID kartou
  const loginFormRfid = document.getElementById('login-form-rfid');
  const rfidInput = document.getElementById('login-rfid');
  
  if (loginFormRfid && rfidInput) {
    // Automatické přihlášení po zadání čísla karty (např. po načtení čtečkou)
    rfidInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      // Pokud je hodnota 8 číslic (typická délka RFID), automaticky odešleme
      if (value.length >= 8 && /^\d+$/.test(value)) {
        setTimeout(() => {
          loginFormRfid.dispatchEvent(new Event('submit'));
        }, 100);
      }
    });
    
    // Přihlášení po odeslání formuláře
    loginFormRfid.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Odesílání formuláře pro přihlášení RFID kartou");
      
      const rfidCard = rfidInput.value.trim();
      
      if (!rfidCard) {
        showAlert('Zadejte číslo RFID karty', 'warning');
        rfidInput.focus();
        return;
      }
      
      try {
        const result = await Auth.loginWithRfid(rfidCard);
        
        if (result.success) {
          updateUIForAuthState();
          showAlert(`Přihlášení uživatele ${result.profile.name} proběhlo úspěšně`, 'success');
        } else {
          showAlert('Přihlášení se nezdařilo: ' + result.error, 'danger');
          rfidInput.value = '';
          rfidInput.focus();
        }
      } catch (error) {
        console.error("Chyba při RFID přihlášení:", error);
        showAlert('Došlo k chybě při RFID přihlášení', 'danger');
        rfidInput.value = '';
        rfidInput.focus();
      }
    });
  }
  
  // Registrace
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log("Odesílání registračního formuláře");
      
      const nameInput = document.getElementById('register-name');
      const emailInput = document.getElementById('register-email');
      const passwordInput = document.getElementById('register-password');
      const confirmInput = document.getElementById('register-password-confirm');
      
      if (!nameInput || !emailInput || !passwordInput || !confirmInput) {
        showAlert('Chyba ve formuláři', 'danger');
        return;
      }
      
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmInput.value;
      
      if (!name || !email || !password) {
        showAlert('Vyplňte všechna povinná pole', 'warning');
        return;
      }
      
      if (password !== confirmPassword) {
        showAlert('Hesla se neshodují', 'warning');
        return;
      }
      
      try {
        const result = await Auth.register(name, email, password);
        
        if (result.success) {
          await AppState.getCurrentUser();
          updateUIForAuthState();
          showAlert('Registrace proběhla úspěšně', 'success');
          window.location.hash = '';
        } else {
          showAlert('Registrace se nezdařila: ' + result.error, 'danger');
        }
      } catch (error) {
        console.error("Chyba při registraci:", error);
        showAlert('Došlo k chybě při registraci', 'danger');
      }
    });
  }
  
  // Kupování kávy
  document.addEventListener('click', async function(e) {
    if (e.target && e.target.classList.contains('buy-coffee-btn')) {
      const productId = parseInt(e.target.dataset.productId);
      console.log("Kupování produktu:", productId);
      
      if (!AppState.currentUser || !AppState.userProfile) {
        showAlert('Nejste přihlášeni', 'warning');
        return;
      }
      
      // Najdeme produkt
      const product = AppState.products.find(p => p.id === productId);
      if (!product) {
        showAlert('Produkt nebyl nalezen', 'danger');
        return;
      }
      
      // Kontrola kreditu
      if (AppState.userProfile.credit < product.price) {
        showAlert('Nemáte dostatečný kredit', 'warning');
        return;
      }
      
      try {
        // Explicitně předáváme ID uživatele do RPC funkce
        const { data, error } = await supabaseClient
          .rpc('purchase_product', { 
            product_id_param: productId,
            user_id_param: AppState.currentUser.id 
          });
        
        if (error) {
          console.error('Chyba při nákupu produktu:', error);
          showAlert('Nákup se nezdařil: ' + error.message, 'danger');
          return;
        }
        
        if (!data.success) {
          showAlert('Nákup se nezdařil: ' + data.error, 'danger');
          return;
        }
        
        // Aktualizace UI s novým kreditem
        AppState.userProfile.credit = data.new_credit;
        updateUIForAuthState();
        showAlert(`Káva ${data.product_name} byla zakoupena za ${data.amount} Kč`, 'success');
        
        // Aktualizace transakcí
        setTimeout(() => {
          renderUserTransactions();
          renderStats();
        }, 500);
      } catch (error) {
        console.error('Neočekávaná chyba při nákupu:', error);
        showAlert('Došlo k chybě při nákupu', 'danger');
      }
    }
  });
  
  // Přepínání záložek
  const tabLinks = document.querySelectorAll('.nav-link');
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Získání ID cílové záložky
      const targetId = this.getAttribute('href').substring(1);
      
      // Deaktivace všech záložek a skrytí všech obsahů
      tabLinks.forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Aktivace vybrané záložky a zobrazení obsahu
      this.classList.add('active');
      document.getElementById(targetId).classList.add('active');
      
      // Aktualizace obsahu podle vybrané záložky
      activateTab(targetId);
    });
  });
  
  console.log("Event listenery byly nastaveny");
}

// Funkce pro aktivaci záložky
function activateTab(targetId) {
  console.log("Aktivuji záložku:", targetId);
  
  // Deaktivace všech záložek a skrytí všech obsahů
  const tabLinks = document.querySelectorAll('.nav-link');
  tabLinks.forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Aktivace cílové záložky
  const targetTab = document.querySelector(`[href="#${targetId}"]`);
  if (targetTab) {
    targetTab.classList.add('active');
  }
  
  // Zobrazení cílového obsahu
  const targetContent = document.getElementById(targetId);
  if (targetContent) {
    targetContent.classList.add('active');
  }
  
  // Aktualizace obsahu podle vybrané záložky
  if (targetId === 'transactions-panel') {
    renderUserTransactions();
  } else if (targetId === 'stats-panel') {
    renderStats();
  } else if (targetId === 'admin-panel' && AppState.userProfile?.is_admin) {
    renderAdminPanel();
  }
}
