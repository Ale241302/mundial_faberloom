from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tournament", "0004_closedmatch"),
    ]

    operations = [
        migrations.AddField(
            model_name="result",
            name="notified",
            field=models.BooleanField(default=False),
        ),
    ]
