// File: public/info.js
class UserInfo extends HTMLElement {
  constructor() {
    super();
    // Dùng Shadow DOM
    this.attachShadow({ mode: 'open' });

    // Cờ theo dõi đang hiện khối "đổi password"
    this.showingChangePwd = false;

    // Hàm xử lý click ngoài shadow root
    this.handleOutsideClick = this.onOutsideClick.bind(this);
  }

  onThemeChanged(e) {
    const newTheme = e.detail.theme;
    console.log('info.js nhận theme-changed:', newTheme);

    if (newTheme === 'dark') {
      this.shadowRoot.host.classList.add('dark-theme');
    } else {
      this.shadowRoot.host.classList.remove('dark-theme');
    }
  }

  connectedCallback() {
    // Code render, loadUserData, ...
    this.render();
    this.loadUserData();

    // Lắng nghe theme-changed
    document.addEventListener('theme-changed', this.onThemeChanged.bind(this));

    // Sự kiện cho nút logout, changePwd ...
    const logoutBtn = this.shadowRoot.querySelector('#logoutBtn');
    const changePwdBtn = this.shadowRoot.querySelector('#changePwdBtn');
    logoutBtn.addEventListener('click', () => this.logout());
    changePwdBtn.addEventListener('click', () => this.showChangePwdUI());
    
    document.addEventListener('click', this.handleOutsideClick);
  }


  disconnectedCallback() {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  /**
   * Tạo giao diện
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 10px;
          left: 10px;
          transform: scale(0.9);
          transform-origin: bottom left;
          font-family: sans-serif;
          z-index: 9999;
        }
        .info-box {
          border: 2px solid #000;
          border-radius: 15px;
          background-color: #fff;
          padding: 10px 15px;
          width: 200px;
          box-shadow: 0 0 5px rgba(0,0,0,0.1);
          text-align: center;
          color: #000; /* Mặc định chữ đen (light theme) */
        }
        .username {
          font-size: 16px;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .buttons {
          display: flex;
          justify-content: space-around;
          align-items: center;
        }
        button {
          cursor: pointer;
          border: 1px solid #444;
          border-radius: 6px;
          background: #f9f9f9;
          padding: 5px 8px;
          font-size: 14px;
          color: #000;
        }
        button:hover {
          background: #eee;
        }

        /* Khu vực đổi password, ẩn ban đầu */
        .change-pwd-section {
          margin-top: 10px;
          display: none;
        }
        .change-pwd-section.show {
          display: block;
        }

        /* ========= THEME DARK ========= */
        :host(.dark-theme) .info-box {
          border-color: #fff;
          background-color: #333;
          color: #fff;
        }
        :host(.dark-theme) button {
          background-color: #444;
          color: #fff;
          border-color: #aaa;
        }
        :host(.dark-theme) button:hover {
          background-color: #555;
        }
      </style>

      <div class="info-box">
        <div class="username">
          username : <span id="usernameField">...</span>
        </div>

        <!-- Hai nút (mặc định) -->
        <div class="buttons" id="defaultBtns">
          <button id="logoutBtn">Sign out</button>
          <button id="changePwdBtn">Change password</button>
        </div>

        <!-- Khu vực đổi password -->
        <div class="change-pwd-section" id="changePwdSection">
          <input 
            type="password"
            id="newPasswordInput"
            placeholder="New password"
          />
          <br><br>
          <button id="confirmPwdBtn">Confirm</button>
        </div>
      </div>
    `;

    // Bắt sự kiện Confirm
    const confirmBtn = this.shadowRoot.querySelector('#confirmPwdBtn');
    confirmBtn.addEventListener('click', () => this.changePassword());
  }

  /**
   * Gọi /user-data để lấy username + theme
   */
  async loadUserData() {
    try {
      const response = await fetch('/user-data', {
        headers: {
          'user-credentials': localStorage.getItem('userCredentials') || ''
        }
      });
      if (response.ok) {
        const userData = await response.json();
        console.log('User data:', userData); // Debug xem theme, username
        // Hiển thị username
        this.shadowRoot.querySelector('#usernameField').textContent = userData.username;

        // Nếu theme là 'dark', thêm class dark-theme
        if (userData.theme === 'dark') {
          this.shadowRoot.host.classList.add('dark-theme');
        } else {
          this.shadowRoot.host.classList.remove('dark-theme');
        }
      } else {
        console.error('Cannot fetch /user-data. Status:', response.status);
      }
    } catch (err) {
      console.error('Error fetching /user-data:', err);
    }
  }

  /**
   * Khi nhấn "change password"
   */
  showChangePwdUI() {
    console.log('showChangePwdUI called');
    this.showingChangePwd = true;
    this.shadowRoot.querySelector('#defaultBtns').style.display = 'none';
    this.shadowRoot.querySelector('#changePwdSection').classList.add('show');
    this.shadowRoot.querySelector('#newPasswordInput').focus();
  }

  /**
   * Ẩn khu vực đổi password
   */
  hideChangePwdUI() {
    console.log('hideChangePwdUI called');
    this.showingChangePwd = false;
    this.shadowRoot.querySelector('#defaultBtns').style.display = 'flex';
    this.shadowRoot.querySelector('#changePwdSection').classList.remove('show');
    this.shadowRoot.querySelector('#newPasswordInput').value = '';
  }

  /**
   * Nếu đang "changePwd" mà click ngoài <user-info>, thì ẩn
   */
  onOutsideClick(e) {
    if (!this.showingChangePwd) return;
    const path = e.composedPath();
    if (!path.includes(this.shadowRoot.host)) {
      this.hideChangePwdUI();
    }
  }

  /**
   * Gửi request POST /change-password
   */
  async changePassword() {
    const newPassword = this.shadowRoot.querySelector('#newPasswordInput').value.trim();
    if (!newPassword) {
      alert('Please enter a new password.');
      return;
    }

    try {
      const response = await fetch('/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-credentials': localStorage.getItem('userCredentials') || ''
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Password changed successfully. Please sign in again.');
          this.logout(); // Xoá credentials, chuyển về login
        } else {
          alert('Cannot change password: ' + (result.message || 'Unknown error'));
        }
      } else {
        // Nếu 401 => credentials không hợp lệ
        alert(`Cannot change password. Status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password.');
    }
  }

  /**
   * Đăng xuất
   */
  logout() {
    localStorage.removeItem('userCredentials');
    window.location.href = '/login.html';
  }
}

customElements.define('user-info', UserInfo);
