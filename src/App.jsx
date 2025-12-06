import React, { useState, useEffect } from 'react';
import { AlertCircle, Package, ShoppingCart, Plus, Search, Check, X, LogOut, User, Lock, Loader } from 'lucide-react';

// Konfiguracja API - ZMIEŃ NA SWOJE URLe z n8n
const API_BASE = 'https://aneta147-20147.wykr.es/webhook';
//const API_BASE = 'https://aneta147-20147.wykr.es/webhook-test';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newOrder, setNewOrder] = useState({
    adresDostawy: ''
  });

  const [selectedProducts, setSelectedProducts] = useState([]);

  // Załaduj produkty
  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
    }
  }, [isLoggedIn]);

  // Załaduj zamówienia użytkownika
  useEffect(() => {
    if (currentUser) {
      fetchOrders();
      setNewOrder({ adresDostawy: currentUser.adres || '' });
    }
  }, [currentUser]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/produkty`);
      const data = await response.json();
      if (data.success && Array.isArray(data.produkty)) {
        const mapped = data.produkty.map((p, idx) => ({
          id: idx + 1,
          nazwa: p['Nazwa produktu'] || p.Nazwa || '',
          sku: p['Kod SKU'] || p.SKU || '',
          cena: parseFloat(p['Cena za jednostke'] || p.Cena || 0),
          dostepnosc: p['Dostepność'] || p.Dostepnosc || 'Tak',
          jednostka: p.Jednostka || 'szt'
        }));
        setProducts(mapped);
      }
    } catch (error) {
      console.error('Błąd pobierania produktów:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/zamowienia?email=${encodeURIComponent(currentUser.email)}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.zamowienia)) {
        const mapped = data.zamowienia.map((o, idx) => ({
          id: idx + 1,
          data: o.Data || '',
          numer: o.Numer_zamowienia || '',
          klient: o.Imie_Nazwisko || o['Imie_Nazwisko'] || '',
          email: o.Email || '',
          telefon: o.Telefon || '',
          adres: o.Adres_dostawy || o['Adres_dostawy'] || '',
          produkty: o.Produkty || '',
          suma: parseFloat(o.Suma || 0),
          status: o.Status || 'W realizacji'
        }));
        setOrders(mapped);
      }
    } catch (error) {
      console.error('Błąd pobierania zamówień:', error);
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          haslo: loginPassword
        })
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        setCurrentUser(data.user);
        setIsLoggedIn(true);
      } else {
        setLoginError(data.error || 'Nieprawidłowy email lub hasło');
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
      setLoginError('Błąd połączenia z serwerem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setOrders([]);
    setProducts([]);
    setSelectedProducts([]);
    setShowNewOrder(false);
  };

  const handleAddProduct = (product) => {
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === product.id ? { ...p, ilosc: p.ilosc + 1 } : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, ilosc: 1 }]);
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const handleUpdateQuantity = (productId, change) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.id === productId) {
        const newQty = Math.max(1, p.ilosc + change);
        return { ...p, ilosc: newQty };
      }
      return p;
    }));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, p) => sum + (p.cena * p.ilosc), 0).toFixed(2);
  };

  const handleSubmitOrder = async () => {
    if (selectedProducts.length === 0) {
      alert('Dodaj produkty do zamówienia');
      return;
    }

    setIsLoading(true);

    try {
      const orderData = {
        email: currentUser.email,
        klient: currentUser.nazwa,
        telefon: currentUser.telefon,
        adresDostawy: newOrder.adresDostawy,
        produkty: selectedProducts.map(p => ({
          nazwa: p.nazwa,
          ilosc: p.ilosc,
          cena: p.cena
        })),
        suma: parseFloat(calculateTotal())
      };

      const response = await fetch(`${API_BASE}/nowe-zamowienie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();

      if (data.success) {
        alert(`Zamówienie ${data.numer} zostało wysłane!`);
        await fetchOrders();
        setNewOrder({ adresDostawy: currentUser.adres });
        setSelectedProducts([]);
        setShowNewOrder(false);
      } else {
        alert('Błąd podczas wysyłania zamówienia: ' + (data.error || 'Nieznany błąd'));
      }
    } catch (error) {
      console.error('Błąd wysyłania zamówienia:', error);
      alert('Błąd połączenia z serwerem');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nazwa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    o.numer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.status && o.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Zamówienia Pasz</h1>
            <p className="text-gray-600">Panel klienta</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="twoj@email.pl"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hasło</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Logowanie...
                </>
              ) : (
                'Zaloguj się'
              )}
            </button>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-800 mb-2">
              <strong>✅ Połączone z Google Sheets!</strong>
            </p>
            <p className="text-xs text-green-700">
              Zaloguj się używając emaila i hasła z arkusza "Baza_klientow"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">📦 Zamówienia Pasz</h1>
            <p className="text-sm text-green-100">{currentUser.nazwa}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-green-700 hover:bg-green-800 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Wyloguj
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 px-4 text-center font-medium ${
              activeTab === 'orders' 
                ? 'bg-green-50 text-green-700 border-b-2 border-green-600' 
                : 'text-gray-600'
            }`}
          >
            <ShoppingCart className="inline w-5 h-5 mr-2" />
            Moje Zamówienia
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-3 px-4 text-center font-medium ${
              activeTab === 'products' 
                ? 'bg-green-50 text-green-700 border-b-2 border-green-600' 
                : 'text-gray-600'
            }`}
          >
            <Package className="inline w-5 h-5 mr-2" />
            Asortyment
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={activeTab === 'orders' ? 'Szukaj zamówienia...' : 'Szukaj produktu...'}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === 'orders' && (
          <div>
            <button
              onClick={() => setShowNewOrder(!showNewOrder)}
              className="w-full mb-4 bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center shadow-lg hover:bg-green-700"
              disabled={isLoading}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nowe Zamówienie
            </button>

            {showNewOrder && (
              <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
                <h3 className="font-bold text-lg mb-4">Nowe Zamówienie</h3>
                
                <div className="mb-4 bg-gray-50 p-3 rounded">
                  <h4 className="font-medium mb-2">Dane dostawy:</h4>
                  <div className="text-sm space-y-1 mb-3">
                    <div><strong>Klient:</strong> {currentUser.nazwa}</div>
                    <div><strong>Email:</strong> {currentUser.email}</div>
                    <div><strong>Telefon:</strong> {currentUser.telefon}</div>
                  </div>
                  <label className="block text-sm font-medium mb-1">Adres dostawy:</label>
                  <input
                    type="text"
                    placeholder="Adres dostawy"
                    className="w-full p-2 border rounded"
                    value={newOrder.adresDostawy}
                    onChange={(e) => setNewOrder({...newOrder, adresDostawy: e.target.value})}
                  />
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Dodaj produkty:</h4>
                  <div className="max-h-48 overflow-y-auto border rounded p-2">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">Ładowanie produktów...</div>
                    ) : (
                      filteredProducts.map(product => (
                        <div key={product.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{product.nazwa}</div>
                            <div className="text-xs text-gray-500">{product.sku} • {product.cena} zł/{product.jednostka}</div>
                          </div>
                          <button
                            onClick={() => handleAddProduct(product)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedProducts.length > 0 && (
                  <div className="mb-4 bg-gray-50 p-3 rounded">
                    <h4 className="font-medium mb-2">Koszyk:</h4>
                    {selectedProducts.map(product => (
                      <div key={product.id} className="flex justify-between items-center mb-2 bg-white p-2 rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{product.nazwa}</div>
                          <div className="text-xs text-gray-500">{product.cena} zł × {product.ilosc} = {(product.cena * product.ilosc).toFixed(2)} zł</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(product.id, -1)}
                            className="bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300"
                          >
                            -
                          </button>
                          <span className="font-medium">{product.ilosc}</span>
                          <button
                            onClick={() => handleUpdateQuantity(product.id, 1)}
                            className="bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>SUMA:</span>
                        <span className="text-green-600">{calculateTotal()} zł</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitOrder}
                    className="flex-1 bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Wysyłanie...
                      </>
                    ) : (
                      'Wyślij Zamówienie'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewOrder(false);
                      setSelectedProducts([]);
                      setNewOrder({ adresDostawy: currentUser.adres });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-400"
                    disabled={isLoading}
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nie masz jeszcze żadnych zamówień</p>
                  <p className="text-sm text-gray-400 mt-2">Kliknij "Nowe Zamówienie" aby złożyć pierwsze</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-lg">{order.numer}</div>
                        <div className="text-sm text-gray-600">{order.data}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-lg">{order.suma} zł</div>
                        {order.status && (
                          <div className={`text-xs px-2 py-1 rounded ${
                            order.status === 'Zrealizowane' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="text-sm"><strong>Adres dostawy:</strong> {order.adres}</div>
                      <div className="mt-2">
                        <strong className="text-sm">Produkty:</strong>
                        <div className="text-sm text-gray-600 ml-2">
                          {order.produkty}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Ładowanie produktów...</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-lg">{product.nazwa}</div>
                      <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                      <div className="text-sm text-gray-600">Jednostka: {product.jednostka}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 text-xl">{product.cena} zł</div>
                      <div className={`text-sm flex items-center justify-end ${
                        product.dostepnosc === 'Tak' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.dostepnosc === 'Tak' ? (
                          <><Check className="w-4 h-4 mr-1" /> Dostępny</>
                        ) : (
                          <><X className="w-4 h-4 mr-1" /> Niedostępny</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 p-3">
        <div className="flex items-start gap-2">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <strong>✅ Połączone z Google Sheets przez n8n!</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
