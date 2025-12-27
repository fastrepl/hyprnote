mod mdgen;

pub use mdgen::*;

use crate::Task;

pub fn all_tasks() -> Vec<Task> {
    vec![mdgen_task()]
}
