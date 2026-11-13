import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  Badge,
  Button,
  Card,
  Notice,
  SectionHeader,
  TextField,
  Toggle,
} from "@/components/ui";

export default function GuidePage() {
  const [name, setName] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [lastAction, setLastAction] = useState("아직 선택한 동작이 없습니다.");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-slate-50 dark:bg-slate-950"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="w-full max-w-5xl self-center px-5 py-8 md:px-8 md:py-12">
          <View className="overflow-hidden rounded-3xl bg-indigo-600 p-6 md:p-8">
            <Badge
              className="bg-white/15"
              label="NativeWind UI"
              tone="primary"
            />
            <Text className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">
              Component Guide
            </Text>
            <Text className="mt-3 max-w-2xl text-base leading-6 text-indigo-100">
              자주 쓰는 UI를 한곳에서 확인하고 복사할 수 있는 기본 가이드입니다.
              색상, 문구와 간격은 서비스에 맞게 편하게 바꿔 사용하세요.
            </Text>
            <View className="mt-6 flex-row flex-wrap gap-2">
              <Badge className="bg-white/15" label="Expo 57" tone="primary" />
              <Badge
                className="bg-white/15"
                label="NativeWind 5"
                tone="primary"
              />
              <Badge className="bg-white/15" label="Dark mode" tone="primary" />
            </View>
          </View>

          <View className="mt-10">
            <SectionHeader
              description="variant와 size만 바꿔 주요 액션에 바로 사용할 수 있습니다."
              eyebrow="Actions"
              title="버튼"
            />
            <Card>
              <View className="flex-row flex-wrap gap-3">
                <Button
                  label="Primary"
                  onPress={() => setLastAction("Primary 버튼을 눌렀습니다.")}
                />
                <Button
                  label="Secondary"
                  onPress={() => setLastAction("Secondary 버튼을 눌렀습니다.")}
                  variant="secondary"
                />
                <Button
                  label="Outline"
                  onPress={() => setLastAction("Outline 버튼을 눌렀습니다.")}
                  variant="outline"
                />
                <Button
                  label="Ghost"
                  onPress={() => setLastAction("Ghost 버튼을 눌렀습니다.")}
                  variant="ghost"
                />
                <Button
                  label="Danger"
                  onPress={() => setLastAction("Danger 버튼을 눌렀습니다.")}
                  variant="danger"
                />
                <Button disabled label="Disabled" />
              </View>
              <View className="mt-5 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <Text className="text-sm text-slate-600 dark:text-slate-300">
                  {lastAction}
                </Text>
              </View>
            </Card>
          </View>

          <View className="mt-10">
            <SectionHeader
              description="라벨, 도움말, 오류 메시지를 같은 규칙으로 표시합니다."
              eyebrow="Form"
              title="입력 필드"
            />
            <Card contentClassName="gap-5">
              <TextField
                helperText="화면에 표시할 이름을 입력하세요."
                label="이름"
                onChangeText={setName}
                placeholder="예: 홍길동"
                value={name}
              />
              <TextField
                errorMessage="올바른 이메일 형식을 입력해 주세요."
                keyboardType="email-address"
                label="이메일"
                placeholder="name@example.com"
              />
              <TextField
                label="메모"
                multiline
                placeholder="내용을 입력하세요."
              />
            </Card>
          </View>

          <View className="mt-10 md:flex-row md:gap-5">
            <View className="mb-10 flex-1 md:mb-0">
              <SectionHeader
                description="상태나 카테고리를 짧게 구분할 때 사용합니다."
                eyebrow="Status"
                title="배지"
              />
              <Card className="h-full">
                <View className="flex-row flex-wrap gap-2">
                  <Badge label="기본" />
                  <Badge label="진행 중" tone="primary" />
                  <Badge label="완료" tone="success" />
                  <Badge label="확인 필요" tone="warning" />
                  <Badge label="실패" tone="danger" />
                </View>
              </Card>
            </View>

            <View className="flex-1">
              <SectionHeader
                description="설정 항목처럼 설명이 필요한 선택값에 사용할 수 있습니다."
                eyebrow="Control"
                title="토글"
              />
              <Card className="h-full">
                <Toggle
                  description="새로운 답변이 도착하면 알림을 받습니다."
                  label="답변 알림"
                  onValueChange={setNotificationEnabled}
                  value={notificationEnabled}
                />
                <View className="my-4 h-px bg-slate-200 dark:bg-slate-800" />
                <Toggle
                  description="권한이 없을 때의 비활성 상태 예시입니다."
                  disabled
                  label="관리자 알림"
                  onValueChange={() => undefined}
                  value={false}
                />
              </Card>
            </View>
          </View>

          <View className="mt-10">
            <SectionHeader
              description="사용자에게 꼭 보여줘야 하는 안내와 상태 메시지입니다."
              eyebrow="Feedback"
              title="알림 메시지"
            />
            <View className="gap-3">
              <Notice
                description="컴포넌트 파일은 components/ui 폴더에서 확인할 수 있습니다."
                title="사용 안내"
              />
              <Notice
                description="변경 사항이 정상적으로 저장되었습니다."
                title="저장 완료"
                tone="success"
              />
              <Notice
                description="삭제한 데이터는 다시 복구하기 어렵습니다."
                title="삭제 전 확인"
                tone="warning"
              />
            </View>
          </View>

          <View className="mt-10 rounded-2xl border border-dashed border-slate-300 p-5 dark:border-slate-700">
            <Text className="text-base font-bold text-slate-900 dark:text-white">
              사용 원칙
            </Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              화면에서는 components/ui의 컴포넌트를 가져와 사용하고, 화면별
              간격과 너비만 className으로 조정하세요. 공통 색상이나 형태를 바꿀
              때는 각 컴포넌트의 variant를 수정하면 됩니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
