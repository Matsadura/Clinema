"""External service integrations (LLM, TMDB) and the
recommendation pipeline that combines them."""


class ServiceError(Exception):
    """An upstream dependency failed or is not configured.

    ``message`` is safe to show to end users.
    """

    def __init__(self, message, status=503):
        super().__init__(message)
        self.message = message
        self.status = status
