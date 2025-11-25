pub const FRAME_10MS: usize = 160;
pub const FRAME_20MS: usize = 320;
pub const FRAME_30MS: usize = 480;

pub fn choose_optimal_frame_size(len: usize) -> usize {
    if len >= FRAME_30MS && len % FRAME_30MS == 0 {
        FRAME_30MS
    } else if len >= FRAME_20MS && len % FRAME_20MS == 0 {
        FRAME_20MS
    } else if len >= FRAME_10MS && len % FRAME_10MS == 0 {
        FRAME_10MS
    } else {
        let padding_30 = (FRAME_30MS - (len % FRAME_30MS)) % FRAME_30MS;
        let padding_20 = (FRAME_20MS - (len % FRAME_20MS)) % FRAME_20MS;
        let padding_10 = (FRAME_10MS - (len % FRAME_10MS)) % FRAME_10MS;

        if padding_30 <= padding_20 && padding_30 <= padding_10 {
            FRAME_30MS
        } else if padding_20 <= padding_10 {
            FRAME_20MS
        } else {
            FRAME_10MS
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frame_size_selection() {
        assert_eq!(choose_optimal_frame_size(160), 160);
        assert_eq!(choose_optimal_frame_size(320), 320);
        assert_eq!(choose_optimal_frame_size(480), 480);
        assert_eq!(choose_optimal_frame_size(960), 480);
        assert_eq!(choose_optimal_frame_size(640), 320);
        assert_eq!(choose_optimal_frame_size(512), 320);
    }

    #[test]
    fn test_frame_size_for_small_inputs() {
        assert_eq!(choose_optimal_frame_size(100), 320);
        assert_eq!(choose_optimal_frame_size(50), 320);
    }
}
