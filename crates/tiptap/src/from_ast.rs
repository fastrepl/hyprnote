use markdown::mdast;

pub fn mdast_to_markdown(node: &mdast::Node) -> Result<String, String> {
    mdast_util_to_markdown::to_markdown_with_options(
        node,
        &mdast_util_to_markdown::Options {
            bullet: '-',
            ..Default::default()
        },
    )
    .map_err(|e| e.to_string())
}
