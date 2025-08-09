from bs4 import BeautifulSoup
from urllib.parse import urljoin

def clean_html_for_llm(html_content: str):
    if not html_content or not html_content.strip():
        return ""

    soup = BeautifulSoup(html_content, 'html.parser')
    
    for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
        tag.decompose()
        
    main_content = soup.find('main') or soup.find('body') or soup
    
    text = main_content.get_text(separator=' ', strip=True)
    
    return text if text else "No content found"


def extract_product_image_url(html_content: str, source_url: str = None):
    if not html_content or not html_content.strip():
        return None

    soup = BeautifulSoup(html_content, 'html.parser')
    
    main_content = soup.find('main') or soup.find('body') or soup

    img_tag = main_content.find('img', src=True)

    if img_tag:
        image_url = img_tag['src']
        if source_url and not image_url.startswith(('http://', 'https://')):
            return urljoin(source_url, image_url)
        return image_url
        
    return None