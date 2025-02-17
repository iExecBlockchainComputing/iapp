import json
import os
# <<args>>
import sys
# <</args>>
# <<inputFile>>
import shutil
# <</inputFile>>
from pyfiglet import Figlet
# <<protectedData>>
import protected_data
# <</protectedData>>

# ⚠️ Your Python code will be run in a python v3.8.3 environment

IEXEC_OUT = os.getenv('IEXEC_OUT')

computed_json = {}

try:
    messages = []

    # <<args>>
    args = sys.argv[1:]
    print(f"Received {len(args)} args")
    if len(args) > 0:
        messages.append(" ".join(args))
    # <</args>>
    # <<protectedData>>

    try:
        # The protected data mock created for the purpose of this Hello World journey
        # contains an object with a key "secretText" which is a string
        protected_text = protected_data.getValue('secretText', 'string')
        messages.append(protected_text)
    except Exception as e:
        print('It seems there is an issue with your protected data:', e)
    # <</protectedData>>
    # <<inputFile>>

    IEXEC_INPUT_FILES_NUMBER = int(os.getenv("IEXEC_INPUT_FILES_NUMBER", 0))
    IEXEC_IN = os.getenv("IEXEC_IN")
    print(f"Received {IEXEC_INPUT_FILES_NUMBER} input files")

    for i in range(1, IEXEC_INPUT_FILES_NUMBER + 1):
        input_file_name = os.getenv(f"IEXEC_INPUT_FILE_NAME_{i}")
        input_file_path = os.path.join(
            IEXEC_IN, input_file_name) if input_file_name else None

        if input_file_path:
            print(f"  Copying input file {i}")
            shutil.copy(input_file_path, os.path.join(
                os.getenv("IEXEC_OUT", ""), f"inputFile_{i}"))
    # <</inputFile>>
    # <<appSecret>>

    IEXEC_APP_DEVELOPER_SECRET = os.getenv("IEXEC_APP_DEVELOPER_SECRET")
    if IEXEC_APP_DEVELOPER_SECRET:
        # Replace all characters with '*'
        redacted_app_secret = '*' * len(IEXEC_APP_DEVELOPER_SECRET)
        print(f"Got an app secret ({redacted_app_secret})!")
    else:
        print("App secret is not set")
    # <</appSecret>>
    # <<requesterSecret>>

    IEXEC_REQUESTER_SECRET_1 = os.getenv("IEXEC_REQUESTER_SECRET_1")
    IEXEC_REQUESTER_SECRET_42 = os.getenv("IEXEC_REQUESTER_SECRET_42")

    if IEXEC_REQUESTER_SECRET_1:
        redacted_requester_secret = '*' * len(IEXEC_REQUESTER_SECRET_1)
        print(f"Got requester secret 1 ({redacted_requester_secret})!")
    else:
        print("Requester secret 1 is not set")

    if IEXEC_REQUESTER_SECRET_42:
        redacted_requester_secret = '*' * len(IEXEC_REQUESTER_SECRET_42)
        print(f"Got requester secret 42 ({redacted_requester_secret})!")
    else:
        print("Requester secret 42 is not set")
    # <</requesterSecret>>

    # Transform input text into an ASCII Art text
    txt = f"Hello, {' '.join(messages) if len(messages) > 0 else 'World'}!"
    ascii_art_text = Figlet().renderText(txt)

    print(ascii_art_text)

    with open(IEXEC_OUT + '/result.txt', 'w') as f:
        f.write(ascii_art_text)
    computed_json = {'deterministic-output-path': IEXEC_OUT + '/result.txt'}
except Exception as e:
    print(e)
    computed_json = {'deterministic-output-path': IEXEC_OUT,
                     'error-message': 'Oops something went wrong'}
finally:
    with open(IEXEC_OUT + '/computed.json', 'w') as f:
        json.dump(computed_json, f)
