/**
 * 認證服務模組
 *
 * 負責：
 * - Google 帳號登入/登出
 * - 認證狀態監聽
 * - 使用者資訊管理
 */

import { initializeFirebase, getAuthInstance, isFirebaseInitialized } from './firebaseConfig.js';

// 當前使用者
let currentUser = null;

// 認證狀態變更回調函數列表
const authStateCallbacks = [];

/**
 * 初始化認證服務
 * @returns {Promise<Object|null>} 當前使用者或 null
 */
async function initAuthService() {
    const firebase = await initializeFirebase();
    if (!firebase) {
        console.log('Firebase 未設定，認證服務無法啟動');
        return null;
    }

    const { onAuthStateChanged } = window.firebaseModules;
    const auth = firebase.auth;

    // 監聽認證狀態變更
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        console.log('認證狀態變更:', user ? user.email : '未登入');

        // 通知所有監聽者
        authStateCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('認證狀態回調執行錯誤:', error);
            }
        });
    });

    return currentUser;
}

/**
 * 使用 Google 帳號登入
 * @returns {Promise<Object>} 使用者資訊
 */
async function signInWithGoogle() {
    if (!isFirebaseInitialized()) {
        throw new Error('請先完成 Firebase 設定');
    }

    const { GoogleAuthProvider, signInWithPopup } = window.firebaseModules;
    const auth = getAuthInstance();

    const provider = new GoogleAuthProvider();

    // 設定額外的 OAuth 參數
    provider.setCustomParameters({
        prompt: 'select_account' // 每次都顯示帳號選擇
    });

    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;

        console.log('Google 登入成功:', currentUser.email);

        return {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
        };
    } catch (error) {
        console.error('Google 登入失敗:', error);

        // 處理常見錯誤
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('登入視窗已關閉');
        } else if (error.code === 'auth/popup-blocked') {
            throw new Error('彈出視窗被封鎖，請允許彈出視窗');
        } else if (error.code === 'auth/cancelled-popup-request') {
            throw new Error('登入請求已取消');
        } else if (error.code === 'auth/unauthorized-domain') {
            throw new Error('此網域未經授權，請在 Firebase 控制台新增此網域');
        }

        throw error;
    }
}

/**
 * 登出
 * @returns {Promise<void>}
 */
async function signOutUser() {
    if (!isFirebaseInitialized()) {
        return;
    }

    const { signOut } = window.firebaseModules;
    const auth = getAuthInstance();

    try {
        await signOut(auth);
        currentUser = null;
        console.log('已登出');
    } catch (error) {
        console.error('登出失敗:', error);
        throw error;
    }
}

/**
 * 取得當前使用者
 * @returns {Object|null}
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * 檢查是否已登入
 * @returns {boolean}
 */
function isSignedIn() {
    return currentUser !== null;
}

/**
 * 取得使用者資訊
 * @returns {Object|null}
 */
function getUserInfo() {
    if (!currentUser) return null;

    return {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
    };
}

/**
 * 取得使用者 ID（用於 Firestore 路徑）
 * @returns {string|null}
 */
function getUserId() {
    return currentUser ? currentUser.uid : null;
}

/**
 * 註冊認證狀態變更回調
 * @param {Function} callback - 回調函數，參數為使用者物件或 null
 * @returns {Function} 取消註冊函數
 */
function onAuthStateChange(callback) {
    authStateCallbacks.push(callback);

    // 立即以當前狀態呼叫一次
    if (isFirebaseInitialized()) {
        callback(currentUser);
    }

    // 返回取消註冊函數
    return () => {
        const index = authStateCallbacks.indexOf(callback);
        if (index > -1) {
            authStateCallbacks.splice(index, 1);
        }
    };
}

/**
 * 等待認證狀態確認
 * @param {number} timeout - 超時時間（毫秒），預設 5000
 * @returns {Promise<Object|null>}
 */
function waitForAuthState(timeout = 5000) {
    return new Promise((resolve, reject) => {
        // 如果已有狀態，直接返回
        if (currentUser !== undefined) {
            resolve(currentUser);
            return;
        }

        const timeoutId = setTimeout(() => {
            reject(new Error('等待認證狀態超時'));
        }, timeout);

        const unsubscribe = onAuthStateChange((user) => {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(user);
        });
    });
}

export {
    initAuthService,
    signInWithGoogle,
    signOutUser,
    getCurrentUser,
    isSignedIn,
    getUserInfo,
    getUserId,
    onAuthStateChange,
    waitForAuthState
};
