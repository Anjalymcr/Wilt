from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Wilt


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')


class WiltSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Wilt
        fields = ('id', 'title', 'content', 'created_at', 'user')
        read_only_fields = ('created_at',)
