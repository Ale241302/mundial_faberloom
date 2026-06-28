from celery import shared_task


@shared_task
def sync_fifa_results():
    from .fifa import sync_results
    n, _ = sync_results()
    return {"updated": n}
