export interface TranscriptMessage {
  type: 'TRANSCRIPT_CAPTURED';
  data: {
    transcript: string;
    title: string;
    participants: string[];
  };
}

export interface CaptureControlMessage {
  type: 'START_CAPTURE' | 'STOP_CAPTURE' | 'GET_STATUS';
}

export interface CaptureStatusResponse {
  isCapturing: boolean;
}
