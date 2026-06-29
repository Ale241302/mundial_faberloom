from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="signup_ip",
            field=models.CharField(blank=True, max_length=45),
        ),
        migrations.AddField(
            model_name="user",
            name="source",
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
