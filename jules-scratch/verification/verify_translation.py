from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000")

        # Wait for the page to redirect to the setup page
        page.wait_for_url("http://localhost:3000/welcome")

        # Fill out the registration form
        page.get_by_label("公司名称").fill("测试公司")
        page.get_by_label("名称").fill("测试用户")
        page.get_by_label("电子邮件地址").fill("test@example.com")
        page.get_by_label("密码").fill("password123")
        page.get_by_role("button", name="注册").click()

        # Wait for navigation to the create organization page
        page.wait_for_url("http://localhost:3000/create-organization")

        # On the create organization page, select a role and create the org
        page.get_by_label("你的角色").select_option("product")
        page.get_by_role("button", name="创建组织").click()

        # Wait for navigation to the home page
        page.wait_for_url("http://localhost:3000/")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Screenshot taken successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
