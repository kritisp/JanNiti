import sys
import logging
sys.stdout.reconfigure(encoding='utf-8')

from app.services.sarvam_service import SarvamService

logging.basicConfig(level=logging.ERROR)

def run():
    try:
        service = SarvamService()
    except Exception as e:
        print(f'Failed to initialize SarvamService: {e}')
        sys.exit(1)

    sentences = {
        'en-IN': 'Hello, how are you doing today?',
        'hi-IN': 'नमस्ते, आप आज कैसे हैं?',
        'od-IN': 'ନମସ୍କାର, ଆପଣ ଆଜି କିପରି ଅଛନ୍ତି?',
        'bn-IN': 'নমস্কার, আপনি আজ কেমন আছেন?'
    }

    print('--- 1. Testing Language Detection ---')
    for expected_code, text in sentences.items():
        try:
            res = service.detect_language(text)
            detected_code = res['code']
            status = 'PASSED' if detected_code == expected_code else 'FAILED'
            print(f'{status} | Detected {detected_code} (Expected: {expected_code})')
        except Exception as e:
            print(f'FAILED for {expected_code}: {e}')

    print('\n--- 2. Testing Translation (To English) ---')
    for code, text in sentences.items():
        if code == 'en-IN': continue
        try:
            res = service.translate(text, source_language=code, target_language='en-IN')
            print(f'[From {code}] -> [en-IN]: {res["translated_text"]}')
        except Exception as e:
            print(f'Translation FAILED for {code}: {e}')

    print('\n--- 3. Testing Translation (English to Others) ---')
    english_text = sentences['en-IN']
    for code in sentences.keys():
        if code == 'en-IN': continue
        try:
            res = service.translate(english_text, source_language='en-IN', target_language=code)
            print(f'[From en-IN] -> [{code}]: {res["translated_text"]}')
        except Exception as e:
            print(f'Translation FAILED to {code}: {e}')

if __name__ == '__main__':
    run()
