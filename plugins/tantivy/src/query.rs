use std::ops::Bound;

use tantivy::Term;
use tantivy::query::{Query, RangeQuery};
use tantivy::schema::Field;

use crate::CreatedAtFilter;

pub fn build_created_at_range_query(
    field: Field,
    filter: &CreatedAtFilter,
) -> Option<Box<dyn Query>> {
    let lower = filter
        .gte
        .or(filter.gt.map(|v| v.saturating_add(1)))
        .unwrap_or(i64::MIN);
    let upper = filter
        .lte
        .or(filter.lt.map(|v| v.saturating_sub(1)))
        .unwrap_or(i64::MAX);

    if let Some(eq) = filter.eq {
        Some(Box::new(RangeQuery::new(
            Bound::Included(Term::from_field_i64(field, eq)),
            Bound::Excluded(Term::from_field_i64(field, eq + 1)),
        )))
    } else if lower != i64::MIN || upper != i64::MAX {
        Some(Box::new(RangeQuery::new(
            Bound::Included(Term::from_field_i64(field, lower)),
            Bound::Excluded(Term::from_field_i64(field, upper.saturating_add(1))),
        )))
    } else {
        None
    }
}
