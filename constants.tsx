import React from 'react';
import { UserRole } from './types';
import { BookOpenIcon, SparklesIcon, BeakerIcon, ClipboardDocumentListIcon, LightBulbIcon, PresentationChartBarIcon, AcademicCapIcon, CameraIcon, SettingsIcon, LibraryIcon, ReportIcon, InformationCircleIcon, DocumentTextIcon } from './components/icons';

export const TOOLS: Record<string, ToolConfig> = {
  // Student Tools
  homeworkHelper: {
    nameKey: 'homeworkHelper_name',
    descriptionKey: 'homeworkHelper_desc',
    categoryKey: 'forStudents',
    icon: <BookOpenIcon />,
    role: 'student',
  },
  topicExplorer: {
    nameKey: 'topicExplorer_name',
    descriptionKey: 'topicExplorer_desc',
    categoryKey: 'forStudents',
    icon: <SparklesIcon />,
    role: 'student',
  },
  summarizer: {
    nameKey: 'summarizer_name',
    descriptionKey: 'summarizer_desc',
    categoryKey: 'forStudents',
    icon: <DocumentTextIcon />,
    role: 'student',
  },
  factFinder: {
    nameKey: 'factFinder_name',
    descriptionKey: 'factFinder_desc',
    categoryKey: 'forStudents',
    icon: <InformationCircleIcon />,
    role: 'student',
  },
  visualAssistant: {
    nameKey: 'visualAssistant_name',
    descriptionKey: 'visualAssistant_desc',
    categoryKey: 'forStudents',
    icon: <CameraIcon />,
    role: 'student',
  },
  quizGenerator: {
    nameKey: 'quizGenerator_name',
    descriptionKey: 'quizGenerator_desc',
    categoryKey: 'forStudents',
    icon: <BeakerIcon />,
    role: 'student',
  },
  myLibrary: {
    nameKey: 'myLibrary_name',
    descriptionKey: 'myLibrary_desc',
    categoryKey: 'forStudents',
    icon: <LibraryIcon />,
    role: 'student',
  },
  myReports: {
    nameKey: 'myReports_name',
    descriptionKey: 'myReports_desc',
    categoryKey: 'forStudents',
    icon: <ReportIcon />,
    role: 'student',
  },

  // Teacher Tools
  lessonPlanner: {
    nameKey: 'lessonPlanner_name',
    descriptionKey: 'lessonPlanner_desc',
    categoryKey: 'forTeachers',
    icon: <ClipboardDocumentListIcon />,
    role: 'teacher',
  },
  activityGenerator: {
    nameKey: 'activityGenerator_name',
    descriptionKey: 'activityGenerator_desc',
    categoryKey: 'forTeachers',
    icon: <LightBulbIcon />,
    role: 'teacher',
  },
  presentationGenerator: {
    nameKey: 'presentationGenerator_name',
    descriptionKey: 'presentationGenerator_desc',
    categoryKey: 'forTeachers',
    icon: <PresentationChartBarIcon />,
    role: 'teacher',
  },
  summarizerTeacher: {
    nameKey: 'summarizer_name',
    descriptionKey: 'summarizer_desc_teacher',
    categoryKey: 'forTeachers',
    icon: <DocumentTextIcon />,
    role: 'teacher',
  },
  reportCardHelper: {
    nameKey: 'reportCardHelper_name',
    descriptionKey: 'reportCardHelper_desc',
    categoryKey: 'forTeachers',
    icon: <AcademicCapIcon />,
    role: 'teacher',
  },
  quizGeneratorTeacher: {
    nameKey: 'quizGenerator_name',
    descriptionKey: 'quizGenerator_desc_teacher',
    categoryKey: 'forTeachers',
    icon: <BeakerIcon />,
    role: 'teacher',
  },
  visualAssistantTeacher: {
    nameKey: 'visualAssistant_name',
    descriptionKey: 'visualAssistant_desc',
    categoryKey: 'forTeachers',
    icon: <CameraIcon />,
    role: 'teacher',
  },


  // Common Tools
  settings: {
    nameKey: 'settings_name',
    descriptionKey: 'settings_desc',
    icon: <SettingsIcon />,
    role: 'student', // Role is nominal; visibility is handled in Sidebar for all users
  },
  
  // Static Pages (for routing)
  about: {
    nameKey: 'about_name',
    descriptionKey: 'about_desc',
    icon: <InformationCircleIcon />,
    role: 'student',
  },
  privacyPolicy: {
    nameKey: 'privacyPolicy_name',
    descriptionKey: 'privacyPolicy_desc',
    icon: <DocumentTextIcon />,
    role: 'student',
  },
  termsAndConditions: {
    nameKey: 'termsAndConditions_name',
    descriptionKey: 'termsAndConditions_desc',
    icon: <ClipboardDocumentListIcon />,
    role: 'student',
  },
};

export type ToolKey = keyof typeof TOOLS;
export interface ToolConfig {
    nameKey: any;
    descriptionKey: any;
    categoryKey?: any;
    icon: React.ReactElement;
    role: UserRole;
}