import frappe

def boot_session(bootinfo):
    """
    Boot session hook to inject custom assets.
    This runs on every page load after login.
    """
    # Add our custom bundles to bootinfo so they can be loaded
    if not bootinfo.get('workhub_assets_loaded'):
        bootinfo['workhub_assets_loaded'] = True
        bootinfo['workhub_css'] = '/assets/workhub_frappe_app/css/workhub.bundle.css'
        bootinfo['workhub_js'] = '/assets/workhub_frappe_app/js/workhub_loader.js'
