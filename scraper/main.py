"""
LinkedIn Job Scraper (Selenium Edition)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Uses headless Chrome to fully render LinkedIn's JavaScript-heavy job search
pages, then extracts job cards with up-to-date CSS selectors.

WHY SELENIUM?
  LinkedIn loads job listings dynamically via JavaScript. Plain requests/
  BeautifulSoup only receives a near-empty HTML shell, which is why the old
  version warned "No job cards found". Selenium launches a real (headless)
  browser that executes the JS and exposes the fully-rendered DOM.

REQUIREMENTS
  pip install selenium webdriver-manager beautifulsoup4

  Chrome (or Chromium) must be installed on your machine.
  webdriver-manager downloads the matching ChromeDriver automatically.

USAGE
  # Default (your original LinkedIn URL)
    python main.py

    # Custom search, 3 pages, JSON output
    python main.py --keywords "software developer" --location "Mumbai, Bangalore, India" --pages 5 --output jobs.json

    # Show the Chrome window (useful if you hit a CAPTCHA)
    python main.py --no-headless
"""

import time
import csv
import json
import random
import argparse
from datetime import datetime
from urllib.parse import urlencode

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager


# ── Default search ─────────────────────────────────────────────────────────────
DEFAULT_URL = (
    "https://www.linkedin.com/jobs/search/"
    "?keywords=software%20developer"
    "&location=Mumbai%2C%Bangalore%2C%20India"
    "&redirect=false&position=1&pageNum=0"
)

# ── Selectors (tried in order — first match wins) ──────────────────────────────
CARD_SELECTORS = [
    "ul.jobs-search__results-list li",          # most common public page
    "div.base-card",                            # alternate card style
    "div.job-search-card",
    "li[data-occludable-job-id]",               # logged-in view leaks into public
    "li[class*='job-result-card']",
    "div[class*='job-card-container']",
]

TITLE_SELECTORS = [
    "h3.base-search-card__title",
    "h3[class*='job-title']",
    "a[class*='job-title']",
    "span[class*='job-title']",
    "h3",
]
COMPANY_SELECTORS = [
    "h4.base-search-card__subtitle",
    "a[class*='company-name']",
    "span[class*='company-name']",
    "h4[class*='company']",
    "a[data-tracking-control-name*='company']",
]
LOCATION_SELECTORS = [
    "span.job-search-card__location",
    "span[class*='job-search-card__location']",
    "span[class*='location']",
]
DATE_SELECTORS = [
    "time[datetime]",
    "time",
    "span[class*='listdate']",
    "span[class*='date']",
]
LINK_SELECTORS = [
    "a[href*='/jobs/view/']",
    "a.base-card__full-link",
    "a[class*='job-title']",
    "a[class*='base-card']",
]


# ── Browser setup ──────────────────────────────────────────────────────────────

def build_driver(headless: bool = True) -> webdriver.Chrome:
    """Return a configured Chrome WebDriver."""
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")        # Chrome 112+ headless
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)

    # Hide the webdriver flag so LinkedIn doesn't detect automation
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"},
    )
    return driver


# ── URL helpers ────────────────────────────────────────────────────────────────

def build_url(keywords: str, location: str, page: int = 0) -> str:
    params = {
        "keywords": keywords,
        "location": location,
        "f_LF": "f_AL",
        "redirect": "false",
        "position": "1",
        "pageNum": str(page),
        "start": str(page * 25),
    }
    return "https://www.linkedin.com/jobs/search/?" + urlencode(params)


# ── Parsing ────────────────────────────────────────────────────────────────────

def _first_text(card: BeautifulSoup, selectors: list) -> str:
    for sel in selectors:
        el = card.select_one(sel)
        if el:
            return el.get_text(strip=True)
    return "N/A"


def parse_jobs_from_html(html: str) -> list:
    """Extract job data from fully-rendered LinkedIn jobs HTML."""
    soup = BeautifulSoup(html, "html.parser")
    cards = []

    for sel in CARD_SELECTORS:
        cards = soup.select(sel)
        if cards:
            print(f"[DEBUG] Selector matched: '{sel}' → {len(cards)} cards")
            break

    if not cards:
        # Print a snippet of visible text to help diagnose what loaded
        text_preview = soup.get_text(separator=" ", strip=True)[:1500]
        print("[WARN] No job cards matched any known selector.")
        print("[DEBUG] Page text preview:\n", text_preview)
        return []

    jobs = []
    for card in cards:
        job = {}
        job["title"]   = _first_text(card, TITLE_SELECTORS)
        job["company"] = _first_text(card, COMPANY_SELECTORS)
        job["location"]= _first_text(card, LOCATION_SELECTORS)

        # Date — prefer machine-readable datetime attribute
        date_el = None
        for sel in DATE_SELECTORS:
            date_el = card.select_one(sel)
            if date_el:
                break
        job["posted"] = (
            date_el.get("datetime") or date_el.get_text(strip=True)
        ) if date_el else "N/A"

        # Job URL
        link_el = None
        for sel in LINK_SELECTORS:
            link_el = card.select_one(sel)
            if link_el and link_el.get("href"):
                break
        job["url"] = link_el["href"].split("?")[0] if link_el else "N/A"

        # Easy Apply badge
        easy = card.select_one(
            "span[class*='easy-apply'], "
            "span[aria-label*='Easy Apply'], "
            "li-icon[type='linkedin-bug']"
        )
        job["easy_apply"] = bool(easy)

        # Skip ghost/empty placeholder cards
        if job["title"] == "N/A" and job["company"] == "N/A":
            continue

        jobs.append(job)

    return jobs


# ── Core scraper ───────────────────────────────────────────────────────────────

def wait_for_jobs(driver: webdriver.Chrome, timeout: int = 20) -> bool:
    """Wait until at least one job card appears in the DOM."""
    wait = WebDriverWait(driver, timeout)
    for sel in CARD_SELECTORS:
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, sel)))
            return True
        except TimeoutException:
            continue
    return False


def scroll_to_load_all(driver: webdriver.Chrome, pause: float = 1.5) -> None:
    """Scroll incrementally so lazy-loaded cards fully render."""
    last_height = driver.execute_script("return document.body.scrollHeight")
    for _ in range(8):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(pause)
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


def scrape_jobs(
    url: str = None,
    keywords: str = None,
    location: str = None,
    max_pages: int = 1,
    headless: bool = True,
) -> list:
    """
    Main scraper entry point.

    Args:
        url:        Full LinkedIn search URL (overrides keywords/location).
        keywords:   Search keywords (e.g. "marketing intern").
        location:   Location string  (e.g. "London, England").
        max_pages:  Pages to scrape; each page has ~25 jobs.
        headless:   Run Chrome invisibly (set False to debug visually).

    Returns:
        List of job dicts with keys: title, company, location, posted,
        url, easy_apply.
    """
    print("[INFO] Launching headless Chrome …")
    driver = build_driver(headless=headless)
    all_jobs = []

    try:
        for page in range(max_pages):
            if url and page == 0:
                page_url = url
            elif keywords or location:
                page_url = build_url(
                    keywords or "software developer",
                    location or "Mumbai, Bangalore, India",
                    page=page,
                )
            else:
                page_url = (
                    DEFAULT_URL if page == 0
                    else build_url(
                        "software developer",
                        "Mumbai, Bangalore, India",
                        page=page,
                    )
                )

            print(f"\n[INFO] ── Page {page + 1}/{max_pages} ──")
            print(f"[INFO] URL: {page_url}")
            driver.get(page_url)

            found = wait_for_jobs(driver, timeout=20)
            if not found:
                print(f"[WARN] Job cards didn't load on page {page + 1}.")
                print(f"[DEBUG] Page title: {driver.title!r}")
                print(
                    "[TIP]  If title contains 'Sign In' or 'Auth', LinkedIn is\n"
                    "       showing a login wall. Try running with --no-headless\n"
                    "       to log in manually, or use a fresh IP/browser profile."
                )
                break

            scroll_to_load_all(driver)

            jobs = parse_jobs_from_html(driver.page_source)
            if not jobs:
                print(f"[INFO] No jobs parsed on page {page + 1}. Stopping.")
                break

            all_jobs.extend(jobs)
            print(f"[INFO] Parsed {len(jobs)} jobs (total: {len(all_jobs)})")

            if page < max_pages - 1:
                delay = random.uniform(3, 6)
                print(f"[INFO] Sleeping {delay:.1f}s before next page …")
                time.sleep(delay)

    except WebDriverException as exc:
        print(f"[ERROR] WebDriver exception: {exc}")
    finally:
        driver.quit()
        print("\n[INFO] Browser closed.")

    return all_jobs


# ── Output helpers ─────────────────────────────────────────────────────────────

def save_csv(jobs: list, path: str) -> None:
    if not jobs:
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=jobs[0].keys())
        writer.writeheader()
        writer.writerows(jobs)
    print(f"[INFO] Saved {len(jobs)} jobs → {path}")


def save_json(jobs: list, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)
    print(f"[INFO] Saved {len(jobs)} jobs → {path}")


def print_jobs(jobs: list) -> None:
    if not jobs:
        print("\nNo jobs found.")
        return
    sep = "─" * 68
    print(f"\n{sep}")
    print(f"  {len(jobs)} job listing(s) found")
    print(sep)
    for i, j in enumerate(jobs, 1):
        badge = "  ✓ Easy Apply" if j.get("easy_apply") else ""
        print(f"\n[{i:03d}] {j['title']}{badge}")
        print(f"       Company  : {j['company']}")
        print(f"       Location : {j['location']}")
        print(f"       Posted   : {j['posted']}")
        print(f"       URL      : {j['url']}")
    print(f"\n{sep}\n")


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape LinkedIn job listings using headless Chrome."
    )
    parser.add_argument("--url",        default=None,
                        help="Full LinkedIn jobs search URL")
    parser.add_argument("--keywords",   default=None,
                        help='Search keywords, e.g. "marketing intern"')
    parser.add_argument("--location",   default=None,
                        help='Location, e.g. "London, England"')
    parser.add_argument("--pages",      type=int, default=1,
                        help="Result pages to scrape (default: 1, ~25 jobs each)")
    parser.add_argument("--output",     default=None,
                        help="Output file path (.csv or .json)")
    parser.add_argument("--no-headless", action="store_true",
                        help="Show the Chrome window (handy for debugging)")
    args = parser.parse_args()

    stamp    = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = args.output or f"linkedin_jobs_{stamp}.csv"

    jobs = scrape_jobs(
        url=args.url,
        keywords=args.keywords,
        location=args.location,
        max_pages=args.pages,
        headless=not args.no_headless,
    )

    print_jobs(jobs)

    if jobs:
        if out_file.endswith(".json"):
            save_json(jobs, out_file)
        else:
            save_csv(jobs, out_file)
    else:
        print("[INFO] Nothing to save.")


if __name__ == "__main__":
    main()