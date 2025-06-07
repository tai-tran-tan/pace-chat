// main.dart
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:intl/intl.dart'; // For date formatting
import 'package:uuid/uuid.dart'; // For generating unique client message IDs

// --- Constants ---
const String BASE_API_URL = 'http://localhost:8080/v1'; // For Flutter Web
const String WS_API_URL =
    'ws://localhost:8080/ws/chat'; // For Flutter Web, note path /ws/chat
// --- Data Models ---

// User Model (simplified)
class User {
  final String userId;
  final String username;
  final String? avatarUrl;
  final String? status; // online, offline, away
  final DateTime? lastSeen;

  User({
    required this.userId,
    required this.username,
    this.avatarUrl,
    this.status,
    this.lastSeen,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['user_id'],
      username: json['username'],
      avatarUrl: json['avatar_url'],
      status: json['status'],
      lastSeen: json['last_seen'] != null
          ? DateTime.parse(json['last_seen'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'username': username,
      'avatar_url': avatarUrl,
      'status': status,
      'last_seen': lastSeen?.toIso8601String(),
    };
  }
}

// UserPublic Model (for participants, search results)
class UserPublic {
  final String userId;
  final String username;
  final String? avatarUrl;

  UserPublic({required this.userId, required this.username, this.avatarUrl});

  factory UserPublic.fromJson(Map<String, dynamic> json) {
    return UserPublic(
      userId: json['user_id'],
      username: json['username'],
      avatarUrl: json['avatar_url'],
    );
  }
}

// Conversation Model
class Conversation {
  final String conversationId;
  final String type; // 'private' or 'group'
  String? name; // For group chats
  final List<UserPublic> participants;
  String? lastMessagePreview;
  DateTime? lastMessageTimestamp;
  int unreadCount;

  Conversation({
    required this.conversationId,
    required this.type,
    this.name,
    required this.participants,
    this.lastMessagePreview,
    this.lastMessageTimestamp,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      conversationId: json['conversation_id'],
      type: json['type'],
      name: json['name'],
      participants: (json['participants'] as List)
          .map((p) => UserPublic.fromJson(p))
          .toList(),
      lastMessagePreview: json['last_message_preview'],
      lastMessageTimestamp: json['last_message_timestamp'] != null
          ? DateTime.parse(json['last_message_timestamp'])
          : null,
      unreadCount: json['unread_count'] ?? 0,
    );
  }

  // Helper to get the other participant in a private chat
  UserPublic? getOtherParticipant(String currentUserId) {
    if (type == 'private' && participants.length == 2) {
      return participants.firstWhere((p) => p.userId != currentUserId);
    }
    return null;
  }
}

// Message Model
class Message {
  final String messageId;
  final String conversationId;
  final String senderId;
  final String content;
  final String messageType; // text, image, video, file
  final DateTime timestamp;
  final List<String> readBy;
  String? clientMessageId; // Used for local tracking before server ACK

  Message({
    required this.messageId,
    required this.conversationId,
    required this.senderId,
    required this.content,
    required this.messageType,
    required this.timestamp,
    this.readBy = const [],
    this.clientMessageId,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      messageId: json['message_id'],
      conversationId: json['conversation_id'],
      senderId: json['sender_id'],
      content: json['content'],
      messageType: json['message_type'],
      timestamp: DateTime.parse(json['timestamp']),
      readBy: List<String>.from(json['read_by'] ?? []),
      clientMessageId:
          json['client_message_id'], // Not always present for received messages
    );
  }

  Map<String, dynamic> toWsPayload() {
    return {
      "type": "SEND_MESSAGE",
      "conversation_id": conversationId,
      "content": content,
      "message_type": messageType,
      "client_message_id": clientMessageId,
    };
  }
}

// --- Services ---

// AuthService: Handles user authentication
class AuthService {
  final String baseUrl;
  final client = http.Client();

  AuthService(this.baseUrl);

  Future<Map<String, dynamic>> register(
    String username,
    String email,
    String password,
  ) async {
    final response = await client.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to register: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    final response = await client.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to login: ${response.body}');
    }
  }

  Future<String> refreshToken(String refreshToken) async {
    final response = await client.post(
      Uri.parse('$baseUrl/auth/refresh-token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': refreshToken}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body)['token'];
    } else {
      throw Exception('Failed to refresh token: ${response.body}');
    }
  }
}

// ChatApiService: Handles HTTP requests for chat data
class ChatApiService {
  final String baseUrl;
  final client = http.Client();
  String? _token;

  ChatApiService(this.baseUrl);

  void setToken(String token) {
    _token = token;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<List<Conversation>> getConversations() async {
    final response = await client.get(
      Uri.parse('$baseUrl/conversations'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Conversation.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load conversations: ${response.body}');
    }
  }

  Future<List<Message>> getMessages(
    String conversationId, {
    String? beforeMessageId,
    int limit = 50,
  }) async {
    Map<String, String> queryParams = {'limit': limit.toString()};
    if (beforeMessageId != null) {
      queryParams['before_message_id'] = beforeMessageId;
    }
    final uri = Uri.parse(
      '$baseUrl/conversations/$conversationId/messages',
    ).replace(queryParameters: queryParams);

    final response = await client.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> messagesJson = data['messages'];
      return messagesJson.map((json) => Message.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load messages: ${response.body}');
    }
  }

  // Placeholder for file upload
  Future<String> uploadFile(File file) async {
    // This is a simplified placeholder. Actual implementation involves multipart request.
    // Refer to `http` or `dio` package documentation for proper file upload.
    // For now, let's just return a dummy URL.
    await Future.delayed(Duration(seconds: 1)); // Simulate network delay
    return "https://placehold.co/150x150/png?text=UploadedFile";
  }

  Future<Conversation> createPrivateConversation(String targetUserId) async {
    final response = await client.post(
      Uri.parse('$baseUrl/conversations/private'),
      headers: _headers,
      body: jsonEncode({'target_user_id': targetUserId}),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Conversation.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(
        'Failed to create private conversation: ${response.body}',
      );
    }
  }

  Future<User> getMyProfile() async {
    final response = await client.get(
      Uri.parse('$baseUrl/users/me'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get my profile: ${response.body}');
    }
  }
}

// WebSocketService: Manages the WebSocket connection for real-time events
class WebSocketService extends ChangeNotifier {
  final String wsUrl;
  WebSocketChannel? _channel;
  String? _token;
  bool _isConnected = false;

  Function(Map<String, dynamic>) onMessageReceived;
  Function(Map<String, dynamic>) onPresenceUpdate;
  Function(Map<String, dynamic>) onTypingIndicator;
  Function(Map<String, dynamic>) onMessageDelivered;
  Function(Map<String, dynamic>) onMessageReadStatus;
  Function(Map<String, dynamic>) onConversationUpdate;

  WebSocketService({
    required this.wsUrl,
    required this.onMessageReceived,
    required this.onPresenceUpdate,
    required this.onTypingIndicator,
    required this.onMessageDelivered,
    required this.onMessageReadStatus,
    required this.onConversationUpdate,
  });

  bool get isConnected => _isConnected;

  void setToken(String token) {
    _token = token;
    _connect(); // Attempt to connect or reconnect with the new token
  }

  void _connect() {
    if (_token == null || _isConnected) return;

    try {
      _channel = WebSocketChannel.connect(Uri.parse('$wsUrl?token=$_token'));
      _isConnected = true;
      notifyListeners();
      print('WebSocket trying to connect to: $wsUrl?token=$_token');

      _channel!.stream.listen(
        (message) {
          final decoded = jsonDecode(message);
          final type = decoded['type'];
          print('WS Received: $type');

          switch (type) {
            case 'AUTH_SUCCESS':
              print('WebSocket authenticated successfully!');
              break;
            case 'AUTH_FAILURE':
              print('WebSocket authentication failed: ${decoded['reason']}');
              _disconnect();
              // Optionally trigger a token refresh or logout
              break;
            case 'MESSAGE_RECEIVED':
              onMessageReceived(decoded);
              break;
            case 'PRESENCE_UPDATE':
              onPresenceUpdate(decoded);
              break;
            case 'TYPING_INDICATOR':
              onTypingIndicator(decoded);
              break;
            case 'MESSAGE_DELIVERED':
              onMessageDelivered(decoded);
              break;
            case 'MESSAGE_READ_STATUS':
              onMessageReadStatus(decoded);
              break;
            case 'CONVERSATION_UPDATE':
              onConversationUpdate(decoded);
              break;
            default:
              print('Unknown WS message type: $type');
          }
        },
        onDone: () {
          print('WebSocket disconnected.');
          _isConnected = false;
          notifyListeners();
          // Implement reconnect logic if needed
        },
        onError: (error) {
          print('WebSocket error: $error');
          _isConnected = false;
          notifyListeners();
        },
        cancelOnError: true,
      );

      // Send AUTH message immediately after connection
      _channel!.sink.add(jsonEncode({"type": "AUTH", "token": _token}));
    } catch (e) {
      print('WebSocket connection error: $e');
      _isConnected = false;
      notifyListeners();
    }
  }

  void sendMessage(Map<String, dynamic> message) {
    if (_isConnected) {
      _channel!.sink.add(jsonEncode(message));
    } else {
      print('WebSocket not connected. Message not sent: $message');
    }
  }

  void sendTypingIndicator(String conversationId, bool isTyping) {
    sendMessage({
      "type": "TYPING_INDICATOR",
      "conversation_id": conversationId,
      "user_id": Provider.of<AuthProvider>(
        (navigatorKey.currentContext!),
        listen: false,
      ).currentUser!.userId,
      "is_typing": isTyping,
    });
  }

  void sendReadReceipt(String conversationId, String messageId) {
    sendMessage({
      "type": "READ_RECEIPT",
      "conversation_id": conversationId,
      "last_read_message_id": messageId,
    });
  }

  void _disconnect() {
    _channel?.sink.close();
    _isConnected = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _disconnect();
    super.dispose();
  }
}

// --- Providers (State Management) ---

// AuthProvider: Manages authentication state
class AuthProvider with ChangeNotifier {
  User? _currentUser;
  String? _token;
  String? _refreshToken;
  bool _isLoading = false;
  String? _errorMessage;

  final AuthService _authService;
  final ChatApiService _chatApiService;
  final WebSocketService _wsService;

  AuthProvider(this._authService, this._chatApiService, this._wsService) {
    _loadTokens();
  }

  User? get currentUser => _currentUser;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _token != null && _currentUser != null;

  Future<void> _loadTokens() async {
    _isLoading = true;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    _refreshToken = prefs.getString('refreshToken');

    if (_token != null) {
      _chatApiService.setToken(_token!);
      try {
        _currentUser = await _chatApiService.getMyProfile();
        _wsService.setToken(_token!); // Connect WebSocket after token is loaded
      } catch (e) {
        print('Failed to load profile or connect WS on startup: $e');
        _clearAuth(); // Clear tokens if profile fails
      }
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> register(String username, String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _authService.register(username, email, password);
      _errorMessage =
          response['message']; // Backend might return success message
      // No automatic login after register in this design
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _authService.login(username, password);
      _token = response['token'];
      _refreshToken = response['refresh_token'];
      _currentUser = User(
        userId: response['user_id'],
        username: response['username'],
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('refreshToken', _refreshToken!);

      _chatApiService.setToken(_token!);
      _wsService.setToken(_token!); // Connect WebSocket after successful login

      return true;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _clearAuth();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('refreshToken');
    _wsService.setToken(''); // Clear token and disconnect WebSocket
    notifyListeners();
  }

  void _clearAuth() {
    _currentUser = null;
    _token = null;
    _refreshToken = null;
    _chatApiService.setToken('');
  }
}

// ChatProvider: Manages conversations and messages
class ChatProvider with ChangeNotifier {
  final ChatApiService _apiService;
  final WebSocketService _wsService;
  final AuthProvider _authProvider;
  final Uuid _uuid = Uuid();

  List<Conversation> _conversations = [];
  Map<String, List<Message>> _messages =
      {}; // conversationId -> List of Messages
  Map<String, Map<String, bool>> _typingStatus =
      {}; // conversationId -> userId -> isTyping
  Map<String, User> _presenceStatus = {}; // userId -> User (with status)

  ChatProvider(this._apiService, this._wsService, this._authProvider) {
    _wsService.onMessageReceived = _handleMessageReceived;
    _wsService.onPresenceUpdate = _handlePresenceUpdate;
    _wsService.onTypingIndicator = _handleTypingIndicator;
    _wsService.onMessageDelivered = _handleMessageDelivered;
    _wsService.onMessageReadStatus = _handleMessageReadStatus;
    _wsService.onConversationUpdate = _handleConversationUpdate;

    // Load initial data if authenticated
    if (_authProvider.isAuthenticated) {
      fetchConversations();
    }
    _authProvider.addListener(_onAuthChanged);
  }

  List<Conversation> get conversations => _conversations;
  List<Message> getMessagesForConversation(String conversationId) =>
      _messages[conversationId] ?? [];
  bool isTyping(String conversationId, String userId) =>
      (_typingStatus[conversationId]?[userId] ?? false);
  String getUserStatus(String userId) =>
      _presenceStatus[userId]?.status ?? 'offline';

  void _onAuthChanged() {
    if (_authProvider.isAuthenticated) {
      fetchConversations();
    } else {
      _conversations = [];
      _messages = {};
      _typingStatus = {};
      _presenceStatus = {};
      notifyListeners();
    }
  }

  Future<void> fetchConversations() async {
    try {
      _conversations = await _apiService.getConversations();
      notifyListeners();
      // For each conversation, fetch a small history slice initially
      for (var conv in _conversations) {
        fetchMessages(conv.conversationId);
      }
    } catch (e) {
      print('Error fetching conversations: $e');
    }
  }

  Future<void> fetchMessages(
    String conversationId, {
    String? beforeMessageId,
  }) async {
    try {
      final newMessages = await _apiService.getMessages(
        conversationId,
        beforeMessageId: beforeMessageId,
      );
      _messages.putIfAbsent(conversationId, () => []);
      _messages[conversationId]!.insertAll(
        0,
        newMessages.reversed,
      ); // Add to beginning for older messages
      notifyListeners();
    } catch (e) {
      print('Error fetching messages for $conversationId: $e');
    }
  }

  Future<Conversation> createPrivateConversation(String targetUserId) async {
    try {
      final newConv = await _apiService.createPrivateConversation(targetUserId);
      _conversations.add(newConv);
      notifyListeners();
      return newConv;
    } catch (e) {
      print('Error creating private conversation: $e');
      rethrow;
    }
  }

  void sendTextMessage(String conversationId, String content) {
    final currentUserId = _authProvider.currentUser!.userId;
    final clientMessageId = _uuid
        .v4(); // Generate a unique ID for client-side tracking

    // Create a temporary local message for immediate display
    final tempMessage = Message(
      messageId: clientMessageId, // Use client ID as temporary message ID
      conversationId: conversationId,
      senderId: currentUserId,
      content: content,
      messageType: 'text',
      timestamp: DateTime.now(),
      clientMessageId: clientMessageId,
      readBy: [currentUserId], // Sender has read it
    );

    _messages.putIfAbsent(conversationId, () => []);
    _messages[conversationId]!.add(tempMessage);
    notifyListeners();

    _wsService.sendMessage(tempMessage.toWsPayload());

    // Update conversation preview
    final convIndex = _conversations.indexWhere(
      (c) => c.conversationId == conversationId,
    );
    if (convIndex != -1) {
      _conversations[convIndex].lastMessagePreview = content;
      _conversations[convIndex].lastMessageTimestamp = tempMessage.timestamp;
      // You might want to move this conversation to the top
      final updatedConv = _conversations.removeAt(convIndex);
      _conversations.insert(0, updatedConv);
      notifyListeners();
    }
  }

  void _handleMessageReceived(Map<String, dynamic> data) {
    final message = Message.fromJson(data['message']);
    _messages.putIfAbsent(message.conversationId, () => []);
    _messages[message.conversationId]!.add(message);
    notifyListeners();

    // Update conversation preview for the conversation
    final convIndex = _conversations.indexWhere(
      (c) => c.conversationId == message.conversationId,
    );
    if (convIndex != -1) {
      _conversations[convIndex].lastMessagePreview = message.content;
      _conversations[convIndex].lastMessageTimestamp = message.timestamp;
      // Increment unread count if not current user's message
      if (message.senderId != _authProvider.currentUser!.userId) {
        _conversations[convIndex].unreadCount++;
      }
      // Move conversation to top
      final updatedConv = _conversations.removeAt(convIndex);
      _conversations.insert(0, updatedConv);
      notifyListeners();
    }
  }

  void _handleMessageDelivered(Map<String, dynamic> data) {
    final clientMessageId = data['client_message_id'];
    final serverMessageId = data['server_message_id'];
    final status = data['status']; // 'success' or 'failure'
    // Find the message by clientMessageId and update its server_message_id
    // This allows you to track delivery status in UI
    _messages.forEach((convId, messages) {
      final index = messages.indexWhere(
        (msg) => msg.clientMessageId == clientMessageId,
      );
      if (index != -1) {
        // You might want to update a 'delivered' status or replace the message ID
        // For simplicity, we'll just print for now.
        print(
          'Message $clientMessageId delivered (server ID: $serverMessageId) with status: $status',
        );
        // If messageId was client-generated, update it to server-generated ID
        messages[index] = Message(
          messageId: serverMessageId,
          conversationId: messages[index].conversationId,
          senderId: messages[index].senderId,
          content: messages[index].content,
          messageType: messages[index].messageType,
          timestamp: messages[index].timestamp,
          readBy: messages[index].readBy,
          clientMessageId: messages[index].clientMessageId,
        );
        notifyListeners();
        return; // Break loop once found
      }
    });
  }

  void _handleMessageReadStatus(Map<String, dynamic> data) {
    final conversationId = data['conversation_id'];
    final messageId = data['message_id'];
    final readerId = data['reader_id'];

    if (_messages.containsKey(conversationId)) {
      // Find the message and all previous messages in the conversation
      // and mark them as read by the readerId.
      bool foundMessage = false;
      for (var i = _messages[conversationId]!.length - 1; i >= 0; i--) {
        final msg = _messages[conversationId]![i];
        if (msg.messageId == messageId) {
          foundMessage = true;
        }
        if (foundMessage && !msg.readBy.contains(readerId)) {
          msg.readBy.add(readerId); // Assuming readBy is mutable for simplicity
        }
      }
      notifyListeners();
    }
  }

  void _handlePresenceUpdate(Map<String, dynamic> data) {
    final userId = data['user_id'];
    final status = data['status'];
    final lastSeen = data['last_seen'] != null
        ? DateTime.parse(data['last_seen'])
        : null;

    _presenceStatus[userId] = User(
      userId: userId,
      username: _presenceStatus[userId]?.username ?? 'Unknown',
      status: status,
      lastSeen: lastSeen,
    );
    notifyListeners();
  }

  void _handleTypingIndicator(Map<String, dynamic> data) {
    final conversationId = data['conversation_id'];
    final userId = data['user_id'];
    final isTyping = data['is_typing'];

    _typingStatus.putIfAbsent(conversationId, () => {});
    _typingStatus[conversationId]![userId] = isTyping;
    notifyListeners();

    // Optionally set a timer to clear typing status if no new indicator comes
  }

  void _handleConversationUpdate(Map<String, dynamic> data) {
    final conversationId = data['conversation_id'];
    final changeType = data['change_type'];

    final convIndex = _conversations.indexWhere(
      (c) => c.conversationId == conversationId,
    );
    if (convIndex != -1) {
      switch (changeType) {
        case 'name_changed':
          _conversations[convIndex].name = data['new_name'];
          break;
        case 'participant_added':
          // TODO: Fetch new participant's full info if not already in participants
          final newParticipantId = data['participant_id'];
          print('Participant $newParticipantId added to $conversationId');
          // For now, just re-fetch conversations to update participants if needed
          fetchConversations();
          break;
        case 'participant_removed':
          final removedParticipantId = data['participant_id'];
          print(
            'Participant $removedParticipantId removed from $conversationId',
          );
          fetchConversations();
          break;
      }
      notifyListeners();
    }
  }

  void sendTypingStatus(String conversationId, bool isTyping) {
    _wsService.sendTypingIndicator(conversationId, isTyping);
  }

  void sendReadReceipt(String conversationId, String messageId) {
    _wsService.sendReadReceipt(conversationId, messageId);

    // Clear unread count for this conversation
    final convIndex = _conversations.indexWhere(
      (c) => c.conversationId == conversationId,
    );
    if (convIndex != -1) {
      _conversations[convIndex].unreadCount = 0;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _authProvider.removeListener(_onAuthChanged);
    super.dispose();
  }
}

// Global navigator key for accessing context outside widgets
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() {
  runApp(
    MultiProvider(
      providers: [
        Provider<AuthService>(create: (_) => AuthService(BASE_API_URL)),
        Provider<ChatApiService>(
          create: (context) => ChatApiService(BASE_API_URL),
        ),
        ChangeNotifierProvider<WebSocketService>(
          create: (context) => WebSocketService(
            wsUrl: WS_API_URL,
            onMessageReceived: (data) => Provider.of<ChatProvider>(
              context,
              listen: false,
            )._handleMessageReceived(data),
            onPresenceUpdate: (data) => Provider.of<ChatProvider>(
              context,
              listen: false,
            )._handlePresenceUpdate(data),
            onTypingIndicator: (data) => Provider.of<ChatProvider>(
              context,
              listen: false,
            )._handleTypingIndicator(data),
            onMessageDelivered: (data) => Provider.of<ChatProvider>(
              context,
              listen: false,
            )._handleMessageDelivered(data),
            onMessageReadStatus: (data) => Provider.of<ChatProvider>(
              context,
              listen: false,
            )._handleMessageReadStatus(data),
            onConversationUpdate: (data) => Provider.of<ChatProvider>(
              context,
              listen: false,
            )._handleConversationUpdate(data),
          ),
        ),
        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            Provider.of<AuthService>(context, listen: false),
            Provider.of<ChatApiService>(context, listen: false),
            Provider.of<WebSocketService>(context, listen: false),
          ),
        ),
        ChangeNotifierProxyProvider3<
          AuthService,
          ChatApiService,
          WebSocketService,
          ChatProvider
        >(
          create: (context) => ChatProvider(
            Provider.of<ChatApiService>(context, listen: false),
            Provider.of<WebSocketService>(context, listen: false),
            Provider.of<AuthProvider>(context, listen: false),
          ),
          update:
              (
                context,
                authService,
                chatApiService,
                wsService,
                previousChatProvider,
              ) =>
                  previousChatProvider ??
                  ChatProvider(
                    chatApiService,
                    wsService,
                    Provider.of<AuthProvider>(context, listen: false),
                  ),
        ),
      ],
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: navigatorKey, // Set global navigator key
      title: 'Pace Chat App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        fontFamily:
            'Inter', // Assuming Inter font is available or set in assets
      ),
      home: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          if (authProvider.isLoading) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          } else if (authProvider.isAuthenticated) {
            return ConversationsScreen();
          } else {
            return LoginScreen();
          }
        },
      ),
      routes: {
        '/login': (context) => LoginScreen(),
        '/register': (context) => RegisterScreen(),
        '/conversations': (context) => ConversationsScreen(),
        '/chat': (context) => ChatScreen(
          conversation:
              ModalRoute.of(context)!.settings.arguments as Conversation,
        ),
      },
    );
  }
}

// --- Screens ---

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Welcome to Pace',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(height: 30),
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Username',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  prefixIcon: Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              const SizedBox(height: 24),
              if (authProvider.isLoading)
                const CircularProgressIndicator()
              else
                ElevatedButton(
                  onPressed: () async {
                    final success = await authProvider.login(
                      _usernameController.text,
                      _passwordController.text,
                    );
                    if (success) {
                      Navigator.of(
                        context,
                      ).pushReplacementNamed('/conversations');
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            authProvider.errorMessage ?? 'Login failed',
                          ),
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 40,
                      vertical: 15,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Login', style: TextStyle(fontSize: 18)),
                ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pushNamed('/register');
                },
                child: const Text("Don't have an account? Register"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RegisterScreen extends StatefulWidget {
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Create Your Pace Account',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor,
                ),
              ),
              const SizedBox(height: 30),
              TextField(
                controller: _usernameController,
                decoration: InputDecoration(
                  labelText: 'Username',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  prefixIcon: Icon(Icons.person),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _emailController,
                decoration: InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              const SizedBox(height: 24),
              if (authProvider.isLoading)
                const CircularProgressIndicator()
              else
                ElevatedButton(
                  onPressed: () async {
                    await authProvider.register(
                      _usernameController.text,
                      _emailController.text,
                      _passwordController.text,
                    );
                    if (authProvider.errorMessage == null ||
                        authProvider.errorMessage!.contains('success')) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            authProvider.errorMessage ??
                                'Registration successful! Please login.',
                          ),
                        ),
                      );
                      Navigator.of(context).pop(); // Go back to login
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            authProvider.errorMessage ?? 'Registration failed',
                          ),
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 40,
                      vertical: 15,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Register', style: TextStyle(fontSize: 18)),
                ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                child: const Text("Already have an account? Login"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ConversationsScreen extends StatefulWidget {
  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ChatProvider>(context, listen: false).fetchConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final chatProvider = Provider.of<ChatProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pace Chats'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => chatProvider.fetchConversations(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await authProvider.logout();
              Navigator.of(context).pushReplacementNamed('/login');
            },
          ),
        ],
      ),
      body: chatProvider.conversations.isEmpty
          ? const Center(child: Text('No conversations yet. Start a new one!'))
          : ListView.builder(
              itemCount: chatProvider.conversations.length,
              itemBuilder: (context, index) {
                final conversation = chatProvider.conversations[index];
                final currentUser = authProvider.currentUser!;
                final displayName = conversation.type == 'private'
                    ? conversation
                              .getOtherParticipant(currentUser.userId)
                              ?.username ??
                          'Unknown User'
                    : conversation.name;
                final displayAvatarUrl = conversation.type == 'private'
                    ? conversation
                          .getOtherParticipant(currentUser.userId)
                          ?.avatarUrl
                    : null; // Group avatars not handled in backend spec

                return Card(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundImage: displayAvatarUrl != null
                          ? NetworkImage(displayAvatarUrl)
                          : null,
                      child: displayAvatarUrl == null
                          ? Icon(
                              conversation.type == 'private'
                                  ? Icons.person
                                  : Icons.group,
                            )
                          : null,
                      backgroundColor: Theme.of(
                        context,
                      ).primaryColor.withOpacity(0.2),
                    ),
                    title: Row(
                      children: [
                        Text(
                          displayName ?? 'Loading...',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        if (conversation.type == 'private') ...[
                          const SizedBox(width: 8),
                          // Display online status for private chats
                          // Note: Presence only for users in the current conversation,
                          // or if the WS service actively tracks all contacts.
                          // For simplicity, we'll check if the other user is in our presence map.
                          if (conversation.getOtherParticipant(
                                currentUser.userId,
                              ) !=
                              null)
                            Consumer<ChatProvider>(
                              builder: (context, chatP, _) {
                                final otherUserId = conversation
                                    .getOtherParticipant(currentUser.userId)!
                                    .userId;
                                final status = chatP.getUserStatus(otherUserId);
                                return Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: status == 'online'
                                        ? Colors.green
                                        : Colors.grey,
                                    shape: BoxShape.circle,
                                  ),
                                );
                              },
                            ),
                        ],
                      ],
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          conversation.lastMessagePreview ?? 'No messages yet.',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: conversation.unreadCount > 0
                                ? Theme.of(context).primaryColor
                                : Colors.grey[600],
                            fontWeight: conversation.unreadCount > 0
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                        if (conversation.lastMessageTimestamp != null)
                          Text(
                            DateFormat('HH:mm').format(
                              conversation.lastMessageTimestamp!.toLocal(),
                            ),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[500],
                            ),
                          ),
                      ],
                    ),
                    trailing: conversation.unreadCount > 0
                        ? Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.secondary,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${conversation.unreadCount}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                          )
                        : null,
                    onTap: () {
                      Navigator.of(
                        context,
                      ).pushNamed('/chat', arguments: conversation);
                    },
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          _showStartNewChatDialog(
            context,
            chatProvider,
            authProvider.currentUser!.userId,
          );
        },
        child: const Icon(Icons.add_comment),
        tooltip: 'Start New Chat',
      ),
    );
  }

  void _showStartNewChatDialog(
    BuildContext context,
    ChatProvider chatProvider,
    String currentUserId,
  ) {
    final TextEditingController _targetUserIdController =
        TextEditingController();

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          title: const Text("Start New Private Chat"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _targetUserIdController,
                decoration: InputDecoration(
                  labelText: "Target User ID",
                  hintText: "Enter user ID to chat with",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),
          actions: <Widget>[
            TextButton(
              child: const Text("Cancel"),
              onPressed: () {
                Navigator.of(dialogContext).pop();
              },
            ),
            ElevatedButton(
              child: const Text("Start Chat"),
              onPressed: () async {
                if (_targetUserIdController.text.isNotEmpty) {
                  try {
                    // Prevent chatting with self
                    if (_targetUserIdController.text == currentUserId) {
                      ScaffoldMessenger.of(dialogContext).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Cannot start a private chat with yourself.',
                          ),
                        ),
                      );
                      return;
                    }

                    // Check if conversation already exists
                    final existingConv = chatProvider.conversations
                        .where(
                          (conv) =>
                              conv.type == 'private' &&
                              conv.participants.any(
                                (p) => p.userId == _targetUserIdController.text,
                              ) &&
                              conv.participants.any(
                                (p) => p.userId == currentUserId,
                              ),
                        )
                        .firstOrNull;

                    if (existingConv != null) {
                      Navigator.of(dialogContext).pop(); // Close dialog
                      Navigator.of(
                        context,
                      ).pushNamed('/chat', arguments: existingConv);
                    } else {
                      final newConversation = await chatProvider
                          .createPrivateConversation(
                            _targetUserIdController.text,
                          );
                      Navigator.of(dialogContext).pop(); // Close dialog
                      Navigator.of(
                        context,
                      ).pushNamed('/chat', arguments: newConversation);
                    }
                  } catch (e) {
                    ScaffoldMessenger.of(dialogContext).showSnackBar(
                      SnackBar(content: Text('Error creating chat: $e')),
                    );
                  }
                }
              },
            ),
          ],
        );
      },
    );
  }
}

class ChatScreen extends StatefulWidget {
  final Conversation conversation;

  ChatScreen({required this.conversation});

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isTyping = false;
  DateTime? _lastTypingSent;
  static const int _typingDebounceMs = 500; // Debounce sending typing indicator
  static const int _typingExpireMs =
      2000; // How long to wait before sending isTyping: false

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ChatProvider>(
        context,
        listen: false,
      ).fetchMessages(widget.conversation.conversationId);
      _scrollController.addListener(_onScroll);
      // Mark as read when entering chat
      _markMessagesAsRead();
    });

    _messageController.addListener(_onMessageTextChanged);
  }

  void _onMessageTextChanged() {
    if (_messageController.text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _lastTypingSent = DateTime.now();
      Provider.of<ChatProvider>(
        context,
        listen: false,
      ).sendTypingStatus(widget.conversation.conversationId, true);
    } else if (_messageController.text.isEmpty && _isTyping) {
      _isTyping = false;
      Provider.of<ChatProvider>(
        context,
        listen: false,
      ).sendTypingStatus(widget.conversation.conversationId, false);
    } else if (_isTyping &&
        DateTime.now().difference(_lastTypingSent!).inMilliseconds >
            _typingDebounceMs) {
      // Re-send typing true to keep it alive if typing continues
      _lastTypingSent = DateTime.now();
      Provider.of<ChatProvider>(
        context,
        listen: false,
      ).sendTypingStatus(widget.conversation.conversationId, true);
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
      // User scrolled to bottom, mark all messages as read
      _markMessagesAsRead();
    }
    if (_scrollController.position.pixels ==
        _scrollController.position.minScrollExtent) {
      // User scrolled to top, fetch older messages
      final chatProvider = Provider.of<ChatProvider>(context, listen: false);
      final messages = chatProvider.getMessagesForConversation(
        widget.conversation.conversationId,
      );
      if (messages.isNotEmpty) {
        chatProvider.fetchMessages(
          widget.conversation.conversationId,
          beforeMessageId: messages.first.messageId,
        );
      }
    }
  }

  void _markMessagesAsRead() {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final messages = chatProvider.getMessagesForConversation(
      widget.conversation.conversationId,
    );
    if (messages.isNotEmpty) {
      final lastMessageId = messages.last.messageId;
      chatProvider.sendReadReceipt(
        widget.conversation.conversationId,
        lastMessageId,
      );
    }
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    Provider.of<ChatProvider>(context, listen: false).sendTextMessage(
      widget.conversation.conversationId,
      _messageController.text.trim(),
    );
    _messageController.clear();
    _isTyping = false; // Reset typing status after sending message
    Provider.of<ChatProvider>(context, listen: false).sendTypingStatus(
      widget.conversation.conversationId,
      false,
    ); // Explicitly send false

    // Scroll to bottom after sending message
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  @override
  void dispose() {
    _messageController.removeListener(_onMessageTextChanged);
    _messageController.dispose();
    _scrollController.dispose();
    // Ensure typing status is false when leaving chat
    Provider.of<ChatProvider>(
      context,
      listen: false,
    ).sendTypingStatus(widget.conversation.conversationId, false);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final chatProvider = Provider.of<ChatProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final messages = chatProvider.getMessagesForConversation(
      widget.conversation.conversationId,
    );
    final currentUser = authProvider.currentUser!;

    String? chatTitle;
    if (widget.conversation.type == 'private') {
      chatTitle =
          widget.conversation
              .getOtherParticipant(currentUser.userId)
              ?.username ??
          'Private Chat';
    } else {
      chatTitle = widget.conversation.name ?? 'Group Chat';
    }

    final typingUsers =
        chatProvider.isTyping(
          widget.conversation.conversationId,
          currentUser.userId,
        )
        ? ''
        : chatProvider
              .getMessagesForConversation(widget.conversation.conversationId)
              .where(
                (msg) =>
                    chatProvider.isTyping(
                      widget.conversation.conversationId,
                      msg.senderId,
                    ) &&
                    msg.senderId != currentUser.userId,
              )
              .map((msg) => msg.senderId)
              .toSet()
              .map(
                (id) => widget.conversation.participants
                    .firstWhere((p) => p.userId == id)
                    .username,
              )
              .join(', ');

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(chatTitle),
            if (typingUsers.isNotEmpty)
              Text(
                '$typingUsers is typing...',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: Colors.white70),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              itemCount: messages.length,
              reverse: false, // Display newest messages at the bottom
              itemBuilder: (context, index) {
                final message = messages[index];
                final isMyMessage = message.senderId == currentUser.userId;
                final sender = widget.conversation.participants.firstWhere(
                  (p) => p.userId == message.senderId,
                  orElse: () =>
                      UserPublic(userId: 'unknown', username: 'Unknown'),
                );

                return Align(
                  alignment: isMyMessage
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isMyMessage ? Colors.blueAccent : Colors.grey[300],
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomLeft: isMyMessage
                            ? const Radius.circular(16)
                            : const Radius.circular(4),
                        bottomRight: isMyMessage
                            ? const Radius.circular(4)
                            : const Radius.circular(16),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: isMyMessage
                          ? CrossAxisAlignment.end
                          : CrossAxisAlignment.start,
                      children: [
                        if (!isMyMessage)
                          Text(
                            sender.username,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: isMyMessage
                                  ? Colors.white70
                                  : Colors.blueGrey[700],
                            ),
                          ),
                        Text(
                          message.content,
                          style: TextStyle(
                            color: isMyMessage ? Colors.white : Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              DateFormat(
                                'HH:mm',
                              ).format(message.timestamp.toLocal()),
                              style: TextStyle(
                                color: isMyMessage
                                    ? Colors.white70
                                    : Colors.black54,
                                fontSize: 10,
                              ),
                            ),
                            if (isMyMessage &&
                                message.readBy.length >
                                    1) // At least 2 means sender + one other
                              Padding(
                                padding: const EdgeInsets.only(left: 4.0),
                                child: Icon(
                                  Icons.done_all,
                                  size: 14,
                                  color: Colors.white70,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Type your message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(25),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FloatingActionButton(
                  onPressed: _sendMessage,
                  child: const Icon(Icons.send),
                  mini: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
