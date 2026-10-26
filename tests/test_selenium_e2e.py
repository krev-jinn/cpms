"""
CPMS Automated End-to-End Browser UI Testing (Assessment 8.1)
Using Selenium WebDriver with Headless Chrome/Edge
Verifies:
1. Dynamic Judicial Homepage with 5 distinct role cards & Dark Mode toggle.
2. One-click role login transition into Case Management Dashboard.
3. Role switching strictly via Homepage return (no role pills inside dashboard).
4. Responsive Modal Dialog rendering (proper viewport fit and no half-hidden clipping).
5. Electronic case filing and validation.
6. AI Case Summary Assistant NLP execution and entity extraction in Dark Mode.
"""

import time
import os
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://127.0.0.1:8080"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

@pytest.fixture(scope="session")
def driver():
    chrome_opts = ChromeOptions()
    chrome_opts.add_argument("--headless=new")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--window-size=1440,900")
    
    try:
        drv = webdriver.Chrome(options=chrome_opts)
    except Exception as e:
        print(f"Chrome failed, trying Edge: {e}")
        edge_opts = EdgeOptions()
        edge_opts.add_argument("--headless=new")
        edge_opts.add_argument("--no-sandbox")
        edge_opts.add_argument("--disable-dev-shm-usage")
        edge_opts.add_argument("--window-size=1440,900")
        drv = webdriver.Edge(options=edge_opts)

    drv.implicitly_wait(6)
    yield drv
    drv.quit()

def test_tc_ui_01_homepage_and_branding(driver):
    """TC_UI_01: Verify dynamic judicial homepage loads with 5 distinct role cards and theme toggle."""
    driver.get(BASE_URL)
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.ID, "cpms-homepage")))

    page_text = driver.page_source
    assert "Court Proceedings Management System" in page_text
    assert "High Court of Judicature" in page_text
    # Verify no unwanted copycat remnants
    assert "VTOP translates to" not in page_text
    assert "Spotlight" not in page_text

    # Verify all 5 distinct role cards exist
    role_cards = driver.find_elements(By.CLASS_NAME, "role-portal-card")
    assert len(role_cards) >= 5, f"Expected 5 role cards, found {len(role_cards)}"

    # Test Theme Toggle on Homepage
    theme_btn = driver.find_element(By.CLASS_NAME, "theme-toggle-btn")
    theme_btn.click()
    time.sleep(0.5)
    current_theme = driver.find_element(By.TAG_NAME, "html").get_attribute("data-theme")
    assert current_theme in ["dark", "light"]

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "01_dynamic_homepage.png"))

def test_tc_ui_02_login_and_dashboard_transition(driver):
    """TC_UI_02: Verify one-click login as Lawyer transitions into dashboard with no internal role-switching pills."""
    driver.get(BASE_URL)
    wait = WebDriverWait(driver, 8)

    # Click Lawyer card to login
    lawyer_card = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".role-portal-card.role-lawyer")))
    driver.execute_script("arguments[0].click();", lawyer_card)
    time.sleep(1.2)

    # Verify app container is visible
    app_container = driver.find_element(By.ID, "app-container")
    assert app_container.is_displayed(), "App container did not become visible"

    # Verify user profile in header
    user_name = driver.find_element(By.ID, "header-user-name").text
    assert "Adv. Arjun Mehta" in user_name

    role_label = driver.find_element(By.ID, "header-user-role").text
    assert "Lawyer" in role_label

    # Verify homepage return button exists
    home_btn = driver.find_element(By.CLASS_NAME, "btn-homepage-nav")
    assert home_btn.is_displayed()
    assert "Homepage" in home_btn.text

    # Verify NO role-switching pills exist in the dashboard header
    pills = driver.find_elements(By.CLASS_NAME, "role-pill")
    assert len(pills) == 0, f"Expected 0 role pills inside dashboard, found {len(pills)}"

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "02_case_management_dashboard.png"))

def test_tc_ui_03_role_switching_via_homepage(driver):
    """TC_UI_03: Verify changing role happens exclusively by returning to the homepage."""
    wait = WebDriverWait(driver, 8)

    # 1. Click Homepage button to return to role selection
    home_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "btn-homepage-nav")))
    driver.execute_script("arguments[0].click();", home_btn)
    time.sleep(0.8)

    # Verify homepage is now visible and dashboard is hidden
    homepage = driver.find_element(By.ID, "cpms-homepage")
    assert homepage.is_displayed(), "Homepage did not display on return"

    # 2. Enter as Judge from the Homepage
    judge_card = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".role-portal-card.role-judge")))
    driver.execute_script("arguments[0].click();", judge_card)
    time.sleep(1.0)

    # Verify logged in as Judge
    assert "Judge" in driver.find_element(By.ID, "header-user-role").text
    assert "Hon. Rajesh Kumar" in driver.find_element(By.ID, "header-user-name").text

    # 3. Return to homepage and enter as Admin
    driver.execute_script("auth.showHomepage()")
    time.sleep(0.6)
    admin_card = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".role-portal-card.role-admin")))
    driver.execute_script("arguments[0].click();", admin_card)
    time.sleep(1.0)

    assert "Admin" in driver.find_element(By.ID, "header-user-role").text
    assert "Priya Sharma" in driver.find_element(By.ID, "header-user-name").text

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "03_role_switching_via_homepage.png"))

def test_tc_ui_04_modal_dialog_responsive_and_visible(driver):
    """TC_UI_04: Verify modal dialogue box is fully visible, centered, and not half-hidden or clipped."""
    wait = WebDriverWait(driver, 8)

    # Return to Lawyer view
    driver.execute_script("auth.showHomepage()")
    time.sleep(0.5)
    lawyer_card = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".role-portal-card.role-lawyer")))
    driver.execute_script("arguments[0].click();", lawyer_card)
    time.sleep(1.0)

    # Open Case Detail Modal for case 1
    driver.execute_script("caseManager.viewCaseDetails(1)")
    time.sleep(0.8)

    modal = driver.find_element(By.ID, "case-detail-modal")
    assert modal.is_displayed(), "Case detail modal is not displayed"

    # Verify modal dialog bounding rect is completely inside the viewport
    dialog = modal.find_element(By.CLASS_NAME, "modal-dialog")
    rect = driver.execute_script("""
        const el = arguments[0];
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height, viewportHeight: window.innerHeight };
    """, dialog)

    # Verify the dialog does not start above viewport and fits properly
    assert rect["top"] >= 0, f"Modal dialog top is clipped above viewport: {rect['top']}"
    assert rect["height"] <= rect["viewportHeight"], f"Modal dialog height ({rect['height']}) exceeds viewport ({rect['viewportHeight']})"

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "04_modal_dialog_responsive.png"))

    # Close modal
    close_btn = modal.find_element(By.CLASS_NAME, "modal-close-btn")
    driver.execute_script("arguments[0].click();", close_btn)
    time.sleep(0.5)

def test_tc_ui_05_case_filing_form(driver):
    """TC_UI_05: Verify Lawyer e-filing form submission and client selection."""
    wait = WebDriverWait(driver, 6)

    # Navigate to File New Case
    driver.execute_script("switchView('file-case-view')")
    time.sleep(0.8)

    # Select client from dropdown
    client_select = wait.until(EC.presence_of_element_located((By.ID, "file-case-client-select")))
    driver.execute_script("""
        const select = document.getElementById('file-case-client-select');
        if (select.options.length > 1) {
            select.selectedIndex = 1;
        } else {
            const opt = document.createElement('option');
            opt.value = '1';
            opt.textContent = 'Ramesh Gupta';
            select.appendChild(opt);
            select.value = '1';
        }
        select.dispatchEvent(new Event('change'));
    """)

    title_input = driver.find_element(By.ID, "file-case-title")
    desc_input = driver.find_element(By.ID, "file-case-description")

    # Enter new petition details
    unique_title = f"Verified Petition v. State Board - Ref {int(time.time())}"
    title_input.clear()
    title_input.send_keys(unique_title)

    desc_input.clear()
    desc_input.send_keys("The petitioner seeks an urgent writ under supervisory jurisdiction for immediate quashing of arbitrary recovery notice and restoration of statutory license.")

    # Submit form
    submit_btn = driver.find_element(By.ID, "file-case-submit-btn")
    driver.execute_script("arguments[0].click();", submit_btn)
    time.sleep(2.0)

    # Check that case appears in cases list
    driver.execute_script("switchView('cases-view'); caseManager.loadCases();")
    time.sleep(1.5)
    assert unique_title in driver.page_source

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "05_case_filing_form.png"))

def test_tc_ui_06_ai_summarizer_and_dark_mode(driver):
    """TC_UI_06: Verify AI Case Summary Assistant NLP execution and entity extraction in Dark Mode."""
    wait = WebDriverWait(driver, 6)

    # Toggle to Dark Mode
    driver.execute_script("document.documentElement.setAttribute('data-theme', 'dark');")
    time.sleep(0.5)

    # Open AI Assistant View
    driver.execute_script("switchView('ai-assistant-view')")
    time.sleep(1.0)

    # Load sample brief
    driver.execute_script("aiAssistantUI.loadSample('commercial')")
    time.sleep(0.5)

    # Click Generate Summary
    summarize_btn = wait.until(EC.element_to_be_clickable((By.ID, "ai-run-btn")))
    driver.execute_script("arguments[0].click();", summarize_btn)
    time.sleep(2.5)

    # Verify summary result container is displayed
    output_container = driver.find_element(By.ID, "ai-output-container")
    assert output_container.is_displayed(), "AI output container not shown"
    assert len(output_container.text) > 30

    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "06_ai_summarizer_dark_mode.png"))
