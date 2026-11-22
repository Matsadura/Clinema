"""Outgoing email over SMTP (any provider: Brevo, Resend, Mailgun,
Gmail with an app password...).

Messages are sent on a background thread so a request never waits on (or
reveals timing from) the mail server. Configure with SMTP_HOST, SMTP_PORT,
SMTP_USERNAME, SMTP_PASSWORD, SMTP_SECURITY and MAIL_FROM.
"""
import logging
import smtplib
import ssl
import threading
from email.message import EmailMessage
from email.utils import make_msgid

log = logging.getLogger(__name__)
TIMEOUT = 15


def configured(config):
    """Email needs a server, a sender and the public URL for links."""
    return bool(config.get("SMTP_HOST") and config.get("MAIL_FROM")
                and config.get("APP_URL"))


def build_message(config, to, subject, text, html=None):
    msg = EmailMessage()
    msg["From"] = config["MAIL_FROM"]
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=config["MAIL_FROM"]
                                   .rsplit("@", 1)[-1].strip("> "))
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    return msg


def deliver(config, msg):
    """Send ``msg`` now (blocking). Raises smtplib/OSError on failure."""
    host, port = config["SMTP_HOST"], config["SMTP_PORT"]
    security = config.get("SMTP_SECURITY", "starttls")
    context = ssl.create_default_context()
    if security == "ssl":
        server = smtplib.SMTP_SSL(host, port, timeout=TIMEOUT,
                                  context=context)
    else:
        server = smtplib.SMTP(host, port, timeout=TIMEOUT)
    with server:
        if security == "starttls":
            server.starttls(context=context)
        if config.get("SMTP_USERNAME"):
            server.login(config["SMTP_USERNAME"], config["SMTP_PASSWORD"])
        server.send_message(msg)


def send_async(config, msg):
    """Send in the background; failures are logged, never raised."""
    snapshot = {k: config.get(k) for k in (
        "SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD",
        "SMTP_SECURITY", "MAIL_FROM")}

    def run():
        try:
            deliver(snapshot, msg)
            log.info("Sent '%s' email", msg["Subject"])
        except (smtplib.SMTPException, OSError) as exc:
            log.error("Email delivery failed: %s", exc.__class__.__name__)

    thread = threading.Thread(target=run, name="mailer", daemon=True)
    thread.start()
    return thread
