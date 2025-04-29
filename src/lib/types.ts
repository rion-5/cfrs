

export interface LoginParam {
	loginId: string;
	password: string;
}


// 세션 데이터 타입
export interface Session {
  id_no: string;
  user_name: string;
}

export interface UserStatus {
  user_name: string;
  id_no: string;
  dept_name: string;
  dept_code: string;

}

export type MyReservation = {
	id: number;
	room_id: number;
  room_name: string;
	start_time: string;
	end_time: string;
	actual_end_time?: string ;
};

export type Reservation = {
  id: number;
  room_id: number;
  user_id: string;
  start_time: string;
  end_time: string;
};

export type Room = {
  id: number;
  name: string;
  type: string;
  capacity: number;
};

// Seat Usage Types
export interface MySeatUsage {
  id: number;
  seat_number: number;
  user_id: string;
  start_time: string;
  end_time?: string ;
}


export interface PyxisLoginData {
  success: boolean;
  code: string;
  message: string;
  data: {
      availableHomepages: number[],
      isPrivacyPolicyAgree: boolean,
      privacyPolicyAgreePeriod: number,
      dept:{
          id:number,
          code:string,
          name: string,
      },
      mobileSiteMobilePatronNo: string,
      accessToken:string,
      parentDept: {
          id:number,
          code: string,
          name: string,
      },
      branch: {
          id: number,
          name: string,
          alias: string,
          libraryCode: string,
          sortOrder: number
      },
      showMobileMain: boolean,
      memberNo: string,
      alternativeId: string,
      lastUpdated: Date,
      branchGroup: {
          id: number,
          name: string
      },
      isPortalLogin: boolean,
      patronType:{
          id: number,
          name: string
      },
      disableServices: string[],
      hasFamily: boolean,
      name: string,
      printMemberNo: string,
      patronState: {
          id: number,
          name: string
      },
      id: number,
      multiTypePatrons: string[],
      isExpired: boolean,
      isFamilyLogin: boolean
  }
}
