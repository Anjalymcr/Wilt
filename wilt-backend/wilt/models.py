from django.db import models
from django.contrib.auth.models import User


class Wilt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wilt_wilt'
        ordering = ['-created_at']

# Create your models here.
