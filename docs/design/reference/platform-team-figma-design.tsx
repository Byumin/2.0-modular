import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { Sidebar } from "./components/Sidebar";
import { TestTakersManagement } from "./components/TestTakersManagement";
import { TestTakerDetail } from "./components/TestTakerDetail";
import { TestTakerRegistration } from "./components/TestTakerRegistration";
import { MyInfoManagement } from "./components/MyInfoManagement";
import { MyInventory } from "./components/MyInventory";
import { MyTestConfiguration } from "./components/MyTestConfiguration";
import { MyTestConfigurationList } from "./components/MyTestConfigurationList";
import { TestManagement } from "./components/TestManagement";
import { MyTestRoom } from "./components/MyTestRoom";
import { TestRoomList } from "./components/TestRoomList";
import { TestRoomPublic } from "./components/TestRoomPublic";

export interface TestConfigurationData {
  id: string;
  name: string;
  description: string;
  selectedTests: string[];
  excludedScales: Record<string, string[]>;
  personalInfo: Array<{
    id: string;
    label: string;
    checked: boolean;
    disabled: boolean;
  }>;
  customQuestions: Array<{
    id: string;
    content: string;
    type: "객관식" | "주관식" | "리커트척도";
  }>;
  createdDate: string;
  lastModified: string;
  usageCount: number;
}

// 초기 Mock 데이터
const initialConfigurations: TestConfigurationData[] = [
  {
    id: "1",
    name: "2025 초등학생 종합 심리평가",
    description:
      "초등학생 대상 지능, 주의력, 행동평가를 포함한 종합 검사",
    selectedTests: ["5", "6", "8"], // K-WISC-V, ACE ADHD, K-BASC
    excludedScales: {},
    personalInfo: [
      {
        id: "name",
        label: "이름",
        checked: true,
        disabled: true,
      },
      {
        id: "gender",
        label: "성별",
        checked: true,
        disabled: true,
      },
      {
        id: "education",
        label: "학력",
        checked: true,
        disabled: false,
      },
      {
        id: "institution",
        label: "소속기관",
        checked: true,
        disabled: false,
      },
    ],
    customQuestions: [
      {
        id: "1",
        content: "학교생활에서 가장 힘든 점은 무엇인가요?",
        type: "주관식",
      },
      {
        id: "2",
        content: "친구들과의 관계는 어떤가요?",
        type: "주관식",
      },
      {
        id: "3",
        content: "공부할 때 가장 어려운 과목은?",
        type: "주관식",
      },
      {
        id: "4",
        content: "집중력이 떨어지는 시간대가 있나요?",
        type: "주관식",
      },
      {
        id: "5",
        content: "부모님과의 관계는 만족스러운가요?",
        type: "리커트척도",
      },
    ],
    createdDate: "2024-11-15",
    lastModified: "2024-11-20",
    usageCount: 12,
  },
  {
    id: "2",
    name: "성인 ADHD 스크리닝 검사",
    description: "성인 ADHD 선별을 위한 맞춤형 검사 구성",
    selectedTests: ["6", "7"], // ACE ADHD, K-WAIS-IV
    excludedScales: {
      "6": ["대인관계"], // ACE ADHD의 대인관계 척도 제외
    },
    personalInfo: [
      {
        id: "name",
        label: "이름",
        checked: true,
        disabled: true,
      },
      {
        id: "gender",
        label: "성별",
        checked: true,
        disabled: true,
      },
      {
        id: "education",
        label: "학력",
        checked: false,
        disabled: false,
      },
      {
        id: "custom-1",
        label: "직업",
        checked: true,
        disabled: false,
      },
    ],
    customQuestions: [
      {
        id: "1",
        content: "업무 중 집중력 저하를 느끼는 빈도는?",
        type: "리커트척도",
      },
      {
        id: "2",
        content: "일상생활에서 물건을 자주 잃어버리나요?",
        type: "객관식",
      },
      {
        id: "3",
        content: "충동적인 결정을 한 경험이 있나요?",
        type: "주관식",
      },
      {
        id: "4",
        content: "과잉행동 증상이 언제부터 시작되었나요?",
        type: "주관식",
      },
      {
        id: "5",
        content: "약물 복용 경험이 있나요?",
        type: "객관식",
      },
      {
        id: "6",
        content: "수면 패턴에 문제가 있나요?",
        type: "주관식",
      },
      {
        id: "7",
        content: "스트레스 대처 방법은?",
        type: "주관식",
      },
      { id: "8", content: "가족력이 있나요?", type: "객관식" },
    ],
    createdDate: "2024-10-20",
    lastModified: "2024-11-18",
    usageCount: 28,
  },
  {
    id: "3",
    name: "학습부진 아동 평가 패키지",
    description:
      "학습부진 아동을 위한 인지능력 및 학습전략 평가",
    selectedTests: ["1", "5", "8", "20"], // MLST-2, K-WISC-V, K-BASC, U&I
    excludedScales: {
      "1": ["짜증", "불안"], // MLST-2의 일부 척도 제외
    },
    personalInfo: [
      {
        id: "name",
        label: "이름",
        checked: true,
        disabled: true,
      },
      {
        id: "gender",
        label: "성별",
        checked: true,
        disabled: true,
      },
      {
        id: "education",
        label: "학력",
        checked: true,
        disabled: false,
      },
      {
        id: "custom-1",
        label: "학교",
        checked: true,
        disabled: false,
      },
      {
        id: "custom-2",
        label: "학년",
        checked: true,
        disabled: false,
      },
    ],
    customQuestions: [
      {
        id: "1",
        content: "가장 좋아하는 과목은?",
        type: "주관식",
      },
      {
        id: "2",
        content: "숙제를 하는데 걸리는 시간은?",
        type: "객관식",
      },
      {
        id: "3",
        content: "학원을 다니고 있나요?",
        type: "객관식",
      },
    ],
    createdDate: "2024-09-10",
    lastModified: "2024-11-10",
    usageCount: 45,
  },
];

export default function App() {
  // URL에서 testroom 파라미터 확인 (실제로는 window.location.pathname 사용)
  const urlParams = new URLSearchParams(window.location.search);
  const isPublicTestRoom = urlParams.get("testroom") !== null;

  const [currentPage, setCurrentPage] = useState(
    isPublicTestRoom ? "public-test-room" : "dashboard",
  );
  const [selectedTestTakerId, setSelectedTestTakerId] =
    useState<number | null>(null);
  const [selectedTestRoomId, setSelectedTestRoomId] = useState<
    string | null
  >(null);
  const [selectedConfigId, setSelectedConfigId] = useState<
    string | null
  >(null);
  const [myInfoTab, setMyInfoTab] = useState<string>("basic");

  // 검사구성 데이터 전역 관리
  const [testConfigurations, setTestConfigurations] = useState<
    TestConfigurationData[]
  >(initialConfigurations);

  const handleNavigateToDetail = (testTakerId: number) => {
    setSelectedTestTakerId(testTakerId);
    setCurrentPage("test-taker-detail");
  };

  const handleBackToList = () => {
    setCurrentPage("test-takers");
    setSelectedTestTakerId(null);
  };

  const handleNavigateToRegistration = () => {
    setCurrentPage("test-taker-registration");
  };

  const handleSaveTestTaker = (data: any) => {
    console.log("새로운 피검사자 등록:", data);
    // TODO: 실제로는 서버에 저장하거나 상태 관리
    alert(`${data.name}님이 성공적으로 등록되었습니다!`);
    setCurrentPage("test-takers");
  };

  const handleNavigateToTestRoomDetail = (
    testRoomId: string,
  ) => {
    setSelectedTestRoomId(testRoomId);
    setCurrentPage("my-test-room-detail");
  };

  const handleBackToTestRoomList = () => {
    setCurrentPage("my-test-room");
    setSelectedTestRoomId(null);
  };

  const handleCreateNewTestRoom = () => {
    setSelectedTestRoomId("new");
    setCurrentPage("my-test-room-detail");
  };

  const handleNavigateToConfigDetail = (configId?: string) => {
    setSelectedConfigId(configId || null);
    setCurrentPage("my-test-config-detail");
  };

  const handleBackToConfigList = () => {
    setCurrentPage("my-test-config");
    setSelectedConfigId(null);
  };

  const handleNavigateToDigitalBadge = () => {
    setMyInfoTab("badge");
    setCurrentPage("my-info");
  };

  const handleNavigateToTestManagement = () => {
    setCurrentPage("test-management");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "public-test-room":
        return <TestRoomPublic />;
      case "my-info":
        return <MyInfoManagement initialTab={myInfoTab} />;
      case "my-inventory":
        return (
          <MyInventory
            onNavigateToTestManagement={
              handleNavigateToTestManagement
            }
          />
        );
      case "test-takers":
        return (
          <TestTakersManagement
            onNavigateToDetail={handleNavigateToDetail}
            onNavigateToRegistration={
              handleNavigateToRegistration
            }
          />
        );
      case "test-taker-detail":
        return selectedTestTakerId ? (
          <TestTakerDetail
            testTakerId={selectedTestTakerId}
            onBack={handleBackToList}
          />
        ) : (
          <TestTakersManagement
            onNavigateToDetail={handleNavigateToDetail}
            onNavigateToRegistration={
              handleNavigateToRegistration
            }
          />
        );
      case "test-taker-registration":
        return (
          <TestTakerRegistration
            onSave={handleSaveTestTaker}
            onBack={handleBackToList}
          />
        );
      case "my-test-config":
        return (
          <MyTestConfigurationList
            configurations={testConfigurations}
            setConfigurations={setTestConfigurations}
            onCreateNew={handleNavigateToConfigDetail}
            onEdit={handleNavigateToConfigDetail}
          />
        );
      case "my-test-config-detail":
        return (
          <MyTestConfiguration
            configId={selectedConfigId || undefined}
            configurations={testConfigurations}
            setConfigurations={setTestConfigurations}
            onBack={handleBackToConfigList}
          />
        );
      case "test-management":
        return <TestManagement />;
      case "my-test-room":
        return (
          <TestRoomList
            onNavigateToDetail={handleNavigateToTestRoomDetail}
            onCreateNew={handleCreateNewTestRoom}
            onBack={() => setCurrentPage("dashboard")}
          />
        );
      case "my-test-room-detail":
        return selectedTestRoomId ? (
          <MyTestRoom
            onBack={handleBackToTestRoomList}
            isNewRoom={selectedTestRoomId === "new"}
          />
        ) : (
          <TestRoomList
            onNavigateToDetail={handleNavigateToTestRoomDetail}
            onCreateNew={handleCreateNewTestRoom}
            onBack={() => setCurrentPage("dashboard")}
          />
        );
      case "dashboard":
      default:
        return (
          <Dashboard
            onNavigateToDigitalBadge={
              handleNavigateToDigitalBadge
            }
            onNavigateToTestManagement={
              handleNavigateToTestManagement
            }
          />
        );
    }
  };

  // 공개 검사실 페이지는 사이드바 없이 표시
  if (currentPage === "public-test-room") {
    return <TestRoomPublic />;
  }

  return (
    <div className="bg-[#F8F9FA] relative min-h-screen flex flex-col">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      {renderPage()}
    </div>
  );
}