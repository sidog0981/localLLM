import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import ButtonPress from '../../../components/ButtonPress';
import { useColorScheme } from '../../../components/useColorScheme';

interface Guide {
  id: number;
  title: string;
  content: string;
  order: number;
}

export default function AdminGuide() {
  const colorScheme = useColorScheme();
  const { user, logout } = adminAuth();

  // Demo guides for testing
  const [guides, setGuides] = React.useState<Guide[]>([
    { id: 1, title: 'Getting Started', content: 'Welcome to the guide! Learn the basics.', order: 1 },
    { id: 2, title: 'Advanced Features', content: 'Learn more about advanced features.', order: 2 },
    { id: 3, title: 'FAQ', content: 'Frequently Asked Questions', order: 3 },
  ]);

  const [newGuide, setNewGuide] = React.useState({
    title: '',
    content: '',
    order: guides.length + 1,
  });

  // Create new guide
  const handleCreateGuide = () => {
    if (!newGuide.title || !newGuide.content) {
      Alert.alert('오류', '제목과 내용을 입력해주세요');
      return;
    }

    const newGuides = [...guides, { 
      ...newGuide, 
      id: Date.now(),
      order: guides.length + 1,
    }];
    
    // Sort by order
    newGuides.sort((a, b) => a.order - b.order);
    
    setGuides(newGuides);
    setNewGuide({ title: '', content: '', order: newGuides.length + 1 });
    Alert.alert('가이드가 생성되었습니다!', newGuide.title);
  };

  // Edit guide
  const handleEditGuide = (guideId: number) => {
    Alert.alert('가이드 편집', '새로운 제목과 내용을 입력해주세요');
    // Implement edit logic
  };

  // Delete guide
  const handleDeleteGuide = (guideId: number) => {
    Alert.alert('가이드 삭제', '선택하신 가이드를 삭제하시겠습니까?');
    // Implement delete logic
  };

  // Change order
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newGuides = [...guides];
    [newGuides[index - 1], newGuides[index]] = [newGuides[index], newGuides[index - 1]];
    setGuides(newGuides);
  };

  const handleMoveDown = (index: number) => {
    if (index === guides.length - 1) return;
    const newGuides = [...guides];
    [newGuides[index], newGuides[index + 1]] = [newGuides[index + 1], newGuides[index]];
    setGuides(newGuides);
  };

  const getCardStyle = () => ({
    backgroundColor: colorScheme === 'dark' ? 'bg-zinc-900' : 'bg-white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colorScheme === 'dark' ? 'border-zinc-700' : 'border-gray-200',
  });

  const getInputStyle = () => ({
    backgroundColor: colorScheme === 'dark' ? 'bg-zinc-800' : 'bg-white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colorScheme === 'dark' ? 'border-zinc-700' : 'border-gray-200',
  });

  const getButtonStyle = (variant: 'primary' | 'secondary') => ({
    backgroundColor: colorScheme === 'dark' 
      ? variant === 'primary' ? '#4a90d9' : 'bg-zinc-800'
      : variant === 'primary' ? '#4a90d9' : 'bg-gray-200',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  });

  const getButtonClass = (variant: 'primary' | 'secondary') => {
    return colorScheme === 'dark' 
      ? variant === 'primary' ? 'bg-blue-500' : 'bg-zinc-800'
      : variant === 'primary' ? 'bg-blue-500' : 'bg-gray-200';
  };

  return (
    <ScrollView className="flex-1 bg-[#121212]">
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 bg-zinc-900">
          <Text className="text-white text-2xl font-bold">📚 가이드 관리</Text>
          <ButtonPress onPress={() => user && logout()}>
            <Text className="text-red-500 text-lg">🚪 로그아웃</Text>
          </ButtonPress>
        </View>

        {/* User info */}
        <View className="p-4">
          <View className="mb-4 bg-zinc-800 p-4 rounded-xl border border-zinc-700">
            <Text className="text-white text-lg font-bold">👤 현재 사용자</Text>
            <Text className="text-gray-300 text-sm mt-2">
              {user?.name} ({user?.email})
            </Text>
            {user?.role !== 'admin' && (
              <Text className="text-red-400 text-sm mt-2">
                ⚠️ 관리자 권한이 필요합니다. admin@guide.com 으로 로그인해주세요.
              </Text>
            )}
          </View>

        {/* Create Guide Section */}
        <View className="mb-6 p-4 rounded-xl border border-blue-500/30">
          <View className="flex-row items-center mb-4">
            <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-3">
              <Text className="text-white font-bold">+</Text>
            </View>
            <Text className="text-white text-lg font-bold">새 가이드 작성</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-gray-300 text-sm mb-2">제목을 입력하세요</Text>
            <TextInput
              value={newGuide.title}
              onChangeText={(text) => setNewGuide({ ...newGuide, title: text })}
              placeholder="가이드 제목"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
              className={`p-4 rounded-xl border-2 border-zinc-700/50 ${
                colorScheme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-white text-black'
              }`}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-300 text-sm mb-2">내용을 입력하세요</Text>
            <TextInput
              value={newGuide.content}
              onChangeText={(text) => setNewGuide({ ...newGuide, content: text })}
              placeholder="가이드 내용을 작성하세요"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
              className={`p-4 rounded-xl border-2 border-zinc-700/50 ${
                colorScheme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-white text-black'
              }`}
              multiline
              numberOfLines={4}
            />
          </View>

          <View className="flex-row">
            <ButtonPress
              onPress={handleCreateGuide}
              className={`${getButtonClass('primary')} p-4 rounded-xl`}
            >
              <Text className="text-white font-bold">📝 생성</Text>
            </ButtonPress>
            <ButtonPress
              onPress={() => setNewGuide({ title: '', content: '', order: guides.length + 1 })}
              className={`${colorScheme === 'dark' ? 'bg-zinc-700' : 'bg-gray-300'} p-4 rounded-xl mx-2`}
            >
              <Text className="text-white font-bold">✖️</Text>
            </ButtonPress>
          </View>
        </View>

        {/* Guides List */}
        <Text className="text-white text-xl font-bold mb-4">📖 가이드 목록</Text>

        {guides.length === 0 ? (
          <Text className="text-gray-400 text-center py-8">등록된 가이드가 없습니다.</Text>
        ) : (
          <View className="flex-1 mt-4">
            <Text className="text-gray-300 text-center font-bold text-lg">📍 드래그하여 위치 변경</Text>
          </View>
        )}

        {guides.length > 1 && (
          <View className="mt-6 mb-4">
            <TouchableOpacity
              onPress={() => handleMoveUp(1)}
              className="px-3 py-2 rounded bg-gray-700 mr-2"
            >
              <Text className="text-white text-sm">⬆️ 위</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMoveDown(1)}
              className="px-3 py-2 rounded bg-gray-700"
            >
              <Text className="text-white text-sm">⬇️ 아래</Text>
            </TouchableOpacity>
          </View>
        )}

        {guides.map((guide, index) => (
          <View key={guide.id} className={`p-4 rounded-xl mb-4 ${
            colorScheme === 'dark' 
              ? 'bg-zinc-800 border border-zinc-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-3">
                <Text className="text-white font-bold">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-bold">{guide.title}</Text>
                <Text className="text-gray-300 text-sm mt-1">{guide.content}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row mt-4">
              <ButtonPress
                onPress={() => handleEditGuide(guide.id)}
                className={`${colorScheme === 'dark' ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-blue-100 border border-blue-300'} p-3 rounded-xl`}
              >
                <Text className={`${colorScheme === 'dark' ? 'text-blue-400' : 'text-blue-700'} text-sm`}>✏️ 수정</Text>
              </ButtonPress>
              <ButtonPress
                onPress={() => handleDeleteGuide(guide.id)}
                className={`${colorScheme === 'dark' ? 'bg-red-500/20 border border-red-500/50' : 'bg-red-100 border border-red-300'} p-3 rounded-xl`}
              >
                <Text className={`${colorScheme === 'dark' ? 'text-red-400' : 'text-red-700'} text-sm`}>🗑️ 삭제</Text>
              </ButtonPress>
            </View>
          </View>
        ))}

        {/* Navigation to Users */}
        <View className="mt-6 p-4 rounded-xl bg-zinc-800 border border-zinc-700">
          <Text className="text-white text-lg font-bold mb-3">
            👥 사용자 관리 페이지로 이동
          </Text>
          <Text className="text-gray-300 text-sm mb-3">
            사용자를 통해 추가 가이드를 등록할 수 있습니다.
          </Text>
          <ButtonPress
              onPress={() => router.push('/admin/protected/users')}
            className={`${colorScheme === 'dark' ? 'bg-blue-500' : 'bg-blue-500'} p-3 rounded-xl`}
          >
            <Text className="text-white font-bold">
              📝 사용자 등록 →
            </Text>
          </ButtonPress>
        </View>

        </View>
      </SafeAreaView>
    </ScrollView>
  );
}