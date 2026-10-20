# Drives the real simulator to check that clearing works (swipe past the bottom, and the glasses menu item).
# Writes before/after screenshots to $SHOT_DIR (default store-assets/screenshots). Needs the production build (npm run build).
from drive import *

def wait(s): time.sleep(s)

s = Session('standard')
try:
    key('click'); wait(2.5)
    say('ja', 'こんにちは、いらっしゃいませ。'); wait(3)
    say('en', 'Two coffees, please.'); wait(3.5)
    shot('v1-standard-before-clear')
    wait(1)
    key('up'); wait(1.5)              # swipe on past the newest translation
    shot('v2-standard-after-swipe-clear')
    say('ja', 'ご注文はお決まりですか？'); wait(3)
    shot('v3-standard-new-conversation')
finally:
    s.stop()

s = Session('predictive')
try:
    key('click'); wait(2.5)
    say('ja', 'ご注文はお決まりですか？'); wait(4.5)
    shot('v4-predictive-before-clear')
    key('down'); wait(0.7); key('down'); wait(1)   # highlight reaches the last reply
    shot('v5-predictive-last-reply')
    wait(0.7)
    key('down'); wait(1.5)                          # on past it: clears
    shot('v6-predictive-after-swipe-clear')
    wait(10.5)
    say('ja', 'ホットとアイス、どちらになさいますか？'); wait(4.5)
    key('context_menu'); wait(1.5)
    shot('v7-menu-with-clear')
    key('down'); wait(0.6)                          # Pause / Resume -> Clear translations
    key('click'); wait(2)
    shot('v8-predictive-after-menu-clear')
finally:
    s.stop()
print('done')
