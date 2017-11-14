let SegmentConstants = require('../../constants/SegmentConstants');
let SegmentStore = require('../../stores/SegmentStore');
let ReviewIssueSelectionPanel = require('./ReviewIssueSelectionPanel').default;
let TranslationIssuesOverviewPanel = require('../TranslationIssuesOverviewPanel').default;
class ReviewSidePanel extends React.Component{

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            sid: null,
            selection : null
        };

    }

    openPanel(e, data) {
        if (this.props.reviewType === "improved") {
            this.setState({
                visible: true,
                selection : data.selection
            });
        } else {
            this.setState({
                visible: true,
            });
        }

    }

    closePanel(e, data) {
        this.setState({visible: false});
    }

    closePanelClick(e, data) {
        this.props.closePanel();
    }

    componentDidMount() {
        SegmentStore.addListener(SegmentConstants.OPEN_ISSUES_PANEL, this.openPanel.bind(this));
        SegmentStore.addListener(SegmentConstants.CLOSE_ISSUES_PANEL, this.closePanel.bind(this));
        SegmentStore.addListener(SegmentConstants.ADD_SEGMENT_VERSIONS_ISSUES, this.segmentOpened.bind(this));

        // $(window).on('segmentOpened', this.segmentOpened.bind(this));

    }

    componentWillUnmount() {
        SegmentStore.removeListener(SegmentConstants.OPEN_ISSUES_PANEL, this.openPanel);
        SegmentStore.removeListener(SegmentConstants.CLOSE_ISSUES_PANEL, this.closePanel);
        SegmentStore.removeListener(SegmentConstants.ADD_SEGMENT_VERSIONS_ISSUES, this.segmentOpened);

        // $(window).off('segmentOpened', this.segmentOpened);
    }

    segmentOpened(sid, segment) {
        this.setState({
            sid: sid,
            selection: null,
            segment: segment
        });
    }

    submitIssueCallback() {
        this.setState({ selection : null });
    }

    render() {
        let innerPanel = '';
        let classes = classnames({
            'hidden' : !this.state.visible,
            'review-improved-panel': this.props.reviewType === "improved",
            'review-extended-panel': this.props.reviewType === "extended",
        });
        if (this.props.reviewType === "improved") {
            if (this.state.visible && this.state.selection != null) {
                innerPanel = <div className="review-side-inner1">
                    <ReviewIssueSelectionPanel submitIssueCallback={this.submitIssueCallback.bind(this)}
                                               selection={this.state.selection} sid={this.state.sid}/>
                </div>
            }
            else if (this.state.visible) {
                innerPanel = <div className="review-side-inner1">
                    <TranslationIssuesOverviewPanel
                        sid={this.state.sid}
                        reviewType={this.props.reviewType}
                    />
                </div>;
            }
        } else {
            if (this.props.reviewType === "extended" && this.state.segment && this.state.visible) {
                innerPanel = <div className="review-side-inner1">
                    <TranslationIssuesOverviewPanel
                        reviewType={this.props.reviewType}
                        segment={this.state.segment}
                        sid={this.state.segment.sid}
                        isReview={this.props.isReview}
                    />
                </div>;
            }
        }

        return <div className={classes} id="review-side-panel">
            <div className="review-side-panel-close" onClick={this.closePanelClick.bind(this)}>x</div>
            {innerPanel}
        </div>;
    }
}

export default ReviewSidePanel ;
