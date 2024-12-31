from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from .models import Wilt
from .serializers import WiltSerializer, UserSerializer
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user
    """
    try:
        data = request.data
        serializer = UserSerializer(data=data)

        if serializer.is_valid():
            user = User.objects.create_user(
                username=data['username'],
                password=data['password']
            )

            # Generate tokens for the new user
            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Registration failed'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Authenticate a user and return tokens
    """
    try:
        username = request.data.get('username')
        password = request.data.get('password')

        print(f"Login attempt for user: {username}")
        print(
            f"Password received: {'*' * len(password) if password else 'None'}")

        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists
        user_exists = User.objects.filter(username=username).exists()
        print(f"User exists in database: {user_exists}")

        user = authenticate(username=username, password=password)
        print(f"Authentication result: {'Success' if user else 'Failed'}")

        if user is not None:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)

            print(f"Login successful for user: {username}")
            print(f"Generated access token: {access_token[:10]}...")

            return Response({
                'status': 'success',
                'message': 'Login successful',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': access_token,
                }
            }, status=status.HTTP_200_OK)
        else:
            print(f"Invalid credentials for user: {username}")
            # Try to authenticate with stored password for debugging
            stored_user = User.objects.get(username=username)
            print(f"Stored user active status: {stored_user.is_active}")

            return Response({
                'error': 'Invalid credentials',
                'user_exists': user_exists
            }, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        print(f"Login error: {str(e)}")
        return Response({
            'error': str(e),
            'message': 'Login failed'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def entry_list(request):
    """
    List all entries or create a new entry
    """
    if request.method == 'GET':
        entries = Wilt.objects.filter(
            user=request.user).order_by('-created_at')
        serializer = WiltSerializer(entries, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = WiltSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def entry_detail(request, pk):
    """
    Retrieve, update or delete an entry
    """
    try:
        entry = Wilt.objects.get(pk=pk, user=request.user)
    except Wilt.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = WiltSerializer(entry)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = WiltSerializer(entry, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
