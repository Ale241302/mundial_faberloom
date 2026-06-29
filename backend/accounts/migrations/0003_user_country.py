from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_user_signup_ip_source")]
    operations = [
        migrations.AddField(model_name="user", name="country",
                            field=models.CharField(blank=True, max_length=2)),
    ]
