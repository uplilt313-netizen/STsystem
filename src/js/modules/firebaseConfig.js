/**
 * Firebase 設定模組
 *
 * 負責：
 * - 動態載入 Firebase SDK
 * - Firebase 初始化
 * - 設定管理
 */

// Firebase SDK 版本
const FIREBASE_VERSION = '10.7.1';

// Firebase SDK CDN URLs
const FIREBASE_CDNS = {
    app: `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`,
    auth: `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`,
    firestore: `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
};

// Firebase 實例
let firebaseApp = null;
let auth = null;
let db = null;

// 載入狀態
let isLoading = false;
let isLoaded = false;

/**
 * 動態載入 Firebase SDK
 * @returns {Promise<void>}
 */
async function loadFirebaseSDK() {
    if (isLoaded) return;
    if (isLoading) {
        // 等待載入完成
        return new Promise((resolve) => {
            const checkLoaded = setInterval(() => {
                if (isLoaded) {
                    clearInterval(checkLoaded);
                    resolve();
                }
            }, 100);
        });
    }

    isLoading = true;

    try {
        // 使用動態 import 載入 Firebase 模組
        const [
            { initializeApp },
            { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged },
            { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, enableIndexedDbPersistence }
        ] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);

        // 將函數存到全域以供其他模組使用
        window.firebaseModules = {
            initializeApp,
            getAuth,
            GoogleAuthProvider,
            signInWithPopup,
            signOut,
            onAuthStateChanged,
            getFirestore,
            collection,
            doc,
            setDoc,
            getDoc,
            getDocs,
            onSnapshot,
            enableIndexedDbPersistence
        };

        isLoaded = true;
        console.log('Firebase SDK 載入完成');
    } catch (error) {
        console.error('Firebase SDK 載入失敗:', error);
        isLoading = false;
        throw error;
    }
}

/**
 * 從 localStorage 取得 Firebase 設定
 * @returns {Object|null}
 */
function getStoredConfig() {
    const config = localStorage.getItem('firebaseConfig');
    if (config) {
        try {
            return JSON.parse(config);
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * 儲存 Firebase 設定到 localStorage
 * @param {Object} config - Firebase 設定
 */
function saveConfig(config) {
    localStorage.setItem('firebaseConfig', JSON.stringify(config));
}

/**
 * 清除 Firebase 設定
 */
function clearConfig() {
    localStorage.removeItem('firebaseConfig');
}

/**
 * 驗證 Firebase 設定是否完整
 * @param {Object} config - Firebase 設定
 * @returns {boolean}
 */
function validateConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'projectId'];
    return requiredFields.every(field => config && config[field]);
}

/**
 * 初始化 Firebase
 * @param {Object} config - Firebase 設定（可選，若不提供則從 localStorage 讀取）
 * @returns {Promise<{app: Object, auth: Object, db: Object}|null>}
 */
async function initializeFirebase(config = null) {
    // 如果已初始化，直接返回
    if (firebaseApp && auth && db) {
        return { app: firebaseApp, auth, db };
    }

    // 取得設定
    const firebaseConfig = config || getStoredConfig();

    if (!firebaseConfig) {
        console.log('尚未設定 Firebase，請先完成設定');
        return null;
    }

    if (!validateConfig(firebaseConfig)) {
        console.error('Firebase 設定不完整');
        return null;
    }

    try {
        // 確保 SDK 已載入
        await loadFirebaseSDK();

        const { initializeApp, getAuth, getFirestore, enableIndexedDbPersistence } = window.firebaseModules;

        // 初始化 Firebase App
        firebaseApp = initializeApp(firebaseConfig);

        // 初始化 Auth
        auth = getAuth(firebaseApp);

        // 初始化 Firestore
        db = getFirestore(firebaseApp);

        // 啟用離線持久化
        try {
            await enableIndexedDbPersistence(db);
            console.log('Firestore 離線持久化已啟用');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('多個分頁開啟中，離線持久化僅在一個分頁中啟用');
            } else if (err.code === 'unimplemented') {
                console.warn('瀏覽器不支援離線持久化');
            }
        }

        // 儲存設定
        if (config) {
            saveConfig(config);
        }

        console.log('Firebase 初始化成功');
        return { app: firebaseApp, auth, db };
    } catch (error) {
        console.error('Firebase 初始化失敗:', error);
        throw error;
    }
}

/**
 * 取得 Firebase Auth 實例
 * @returns {Object|null}
 */
function getAuthInstance() {
    return auth;
}

/**
 * 取得 Firestore 實例
 * @returns {Object|null}
 */
function getDbInstance() {
    return db;
}

/**
 * 檢查 Firebase 是否已初始化
 * @returns {boolean}
 */
function isFirebaseInitialized() {
    return firebaseApp !== null && auth !== null && db !== null;
}

/**
 * 檢查是否有儲存的 Firebase 設定
 * @returns {boolean}
 */
function hasStoredConfig() {
    return getStoredConfig() !== null;
}

/**
 * 重置 Firebase（用於切換帳號或重新設定）
 */
function resetFirebase() {
    firebaseApp = null;
    auth = null;
    db = null;
}

export {
    loadFirebaseSDK,
    initializeFirebase,
    getStoredConfig,
    saveConfig,
    clearConfig,
    validateConfig,
    getAuthInstance,
    getDbInstance,
    isFirebaseInitialized,
    hasStoredConfig,
    resetFirebase
};
